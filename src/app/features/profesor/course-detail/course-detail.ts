import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { SectionService } from '../../../core/services/section.service';
import { ActivityService } from '../../../core/services/activity.service';
import { CohortService } from '../../../core/services/cohort.service';
import { NotificationService } from '../../../core/services/notification.service';
import { CourseResult } from '../../../core/models/course.model';
import { SectionResult } from '../../../core/models/section.model';
import { ActivityResult, ActivityType } from '../../../core/models/activity.model';
import { AddStudentsToCourseResult } from '../../../core/models/enrollment.model';
import { CohortResult } from '../../../core/models/cohort.model';
import { UserResult } from '../../../core/models/user.model';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { RichTextEditor } from '../../../shared/ui/rich-text-editor/rich-text-editor';
import { StudentPicker } from '../../../shared/ui/student-picker/student-picker';
import { ActivityDetail } from '../../../shared/ui/activity-detail/activity-detail';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-course-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ConfirmDialog, RichTextEditor, StudentPicker, ActivityDetail],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.css',
})
export class CourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseService);
  private readonly sectionService = inject(SectionService);
  private readonly activityService = inject(ActivityService);
  private readonly cohortService = inject(CohortService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;

  protected readonly course = signal<CourseResult | null>(null);
  protected readonly sections = signal<SectionResult[]>([]);
  protected readonly cohorts = signal<CohortResult[]>([]);
  protected readonly activitiesBySection = signal<Record<string, ActivityResult[]>>({});
  protected readonly expandedSectionId = signal<string | null>(null);

  protected readonly isAddingSection = signal(false);
  protected readonly addingActivityForSectionId = signal<string | null>(null);

  protected readonly sectionErrorMessage = signal<string | null>(null);
  protected readonly activityErrorMessage = signal<string | null>(null);
  protected readonly studentsErrorMessage = signal<string | null>(null);
  protected readonly studentsResultMessage = signal<string | null>(null);
  protected readonly notifyMessage = signal<string | null>(null);

  protected readonly sectionCohortIds = signal<Set<string>>(new Set());
  protected readonly activityCohortIds = signal<Set<string>>(new Set());
  protected readonly activityFiles = signal<File[]>([]);
  protected readonly activityFilesErrorMessage = signal<string | null>(null);

  protected readonly isDeletingCourse = signal(false);
  protected readonly showDeleteCourseConfirm = signal(false);
  protected readonly deleteCourseErrorMessage = signal<string | null>(null);

  protected readonly sectionToDelete = signal<SectionResult | null>(null);
  protected readonly isDeletingSection = signal(false);
  protected readonly deleteSectionErrorMessage = signal<string | null>(null);

  protected readonly activityTypes: ActivityType[] = ['SoloTexto', 'ConArchivo'];

  protected readonly sectionForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    descriptionHtml: [''],
  });

  protected readonly activityForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    dueDate: ['', Validators.required],
    type: ['SoloTexto' as ActivityType, Validators.required],
    maxFiles: [1],
  });

  protected readonly pendingStudents = signal<UserResult[]>([]);

  protected readonly selectedActivity = signal<ActivityResult | null>(null);

  constructor() {
    this.loadCourse();
    this.loadSections();
    this.loadCohorts();
  }

  private loadCourse(): void {
    this.courseService.getById(this.courseId).subscribe((course) => this.course.set(course));
  }

  private loadSections(): void {
    this.courseService.getSections(this.courseId).subscribe((sections) => this.sections.set(sections));
  }

  private loadCohorts(): void {
    this.cohortService.getByCourse(this.courseId).subscribe((cohorts) => this.cohorts.set(cohorts));
  }

  toggleSection(sectionId: string): void {
    if (this.expandedSectionId() === sectionId) {
      this.expandedSectionId.set(null);
      return;
    }

    this.expandedSectionId.set(sectionId);
    if (!this.activitiesBySection()[sectionId]) {
      this.sectionService.getActivities(sectionId).subscribe((activities) => {
        this.activitiesBySection.update((map) => ({ ...map, [sectionId]: activities }));
      });
    }
  }

  toggleSectionCohort(cohortId: string): void {
    this.sectionCohortIds.update((current) => toggleInSet(current, cohortId));
  }

  toggleActivityCohort(cohortId: string): void {
    this.activityCohortIds.update((current) => toggleInSet(current, cohortId));
  }

  submitSection(): void {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    this.sectionErrorMessage.set(null);
    const { title, descriptionHtml } = this.sectionForm.getRawValue();
    const cohortIds = [...this.sectionCohortIds()];

    this.sectionService.create(this.courseId, title, descriptionHtml, cohortIds).subscribe({
      next: (section) => {
        this.sections.update((current) => [...current, section]);
        this.sectionForm.reset({ title: '', descriptionHtml: '' });
        this.sectionCohortIds.set(new Set());
        this.isAddingSection.set(false);
      },
      error: () => this.sectionErrorMessage.set('No se pudo crear la sección.'),
    });
  }

  startAddingActivity(sectionId: string): void {
    this.activityErrorMessage.set(null);
    this.activityFilesErrorMessage.set(null);
    this.activityForm.reset({ title: '', description: '', dueDate: '', type: 'SoloTexto', maxFiles: 1 });
    this.activityCohortIds.set(new Set());
    this.activityFiles.set([]);
    this.addingActivityForSectionId.set(sectionId);
  }

  onActivityFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const tooLarge = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (tooLarge.length > 0) {
      this.activityFilesErrorMessage.set(
        `${tooLarge.map((f) => f.name).join(', ')} supera el límite de 10MB por archivo.`,
      );
      input.value = '';
      return;
    }

    this.activityFilesErrorMessage.set(null);
    this.activityFiles.set(files);
  }

  removeActivityFile(fileName: string): void {
    this.activityFiles.update((current) => current.filter((f) => f.name !== fileName));
  }

  submitActivity(sectionId: string): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    this.activityErrorMessage.set(null);
    const { title, description, dueDate, type, maxFiles } = this.activityForm.getRawValue();
    const dueDateUtc = new Date(dueDate).toISOString();

    this.activityService
      .create({
        sectionId,
        title,
        description,
        dueDateUtc,
        type,
        maxFiles: type === 'ConArchivo' ? maxFiles : null,
        cohortIds: [...this.activityCohortIds()],
        files: this.activityFiles(),
      })
      .subscribe({
        next: (activity) => {
          this.activitiesBySection.update((map) => ({
            ...map,
            [sectionId]: [...(map[sectionId] ?? []), activity],
          }));
          this.addingActivityForSectionId.set(null);
        },
        error: () => this.activityErrorMessage.set('No se pudo crear la actividad.'),
      });
  }

  notifyNewSection(sectionId: string): void {
    this.notifyMessage.set(null);
    this.notificationService.notifyNewSection(sectionId).subscribe({
      next: () => this.notifyMessage.set('Se notificó a los estudiantes inscritos.'),
      error: () => this.notifyMessage.set('No se pudo enviar la notificación.'),
    });
  }

  notifyNewActivity(activityId: string): void {
    this.notifyMessage.set(null);
    this.notificationService.notifyNewActivity(activityId).subscribe({
      next: () => this.notifyMessage.set('Se notificó a los estudiantes inscritos.'),
      error: () => this.notifyMessage.set('No se pudo enviar la notificación.'),
    });
  }

  sendDueDateReminder(activityId: string): void {
    this.notifyMessage.set(null);
    this.notificationService.sendDueDateReminder(activityId).subscribe({
      next: () => this.notifyMessage.set('Se envió el recordatorio de fecha límite.'),
      error: () => this.notifyMessage.set('No se pudo enviar el recordatorio.'),
    });
  }

  pendingStudentIds(): ReadonlySet<string> {
    return new Set(this.pendingStudents().map((student) => student.id));
  }

  onStudentPicked(student: UserResult): void {
    this.pendingStudents.update((current) => [...current, student]);
  }

  removePendingStudent(studentId: string): void {
    this.pendingStudents.update((current) => current.filter((student) => student.id !== studentId));
  }

  submitStudents(): void {
    const students = this.pendingStudents();
    if (students.length === 0) return;

    this.studentsErrorMessage.set(null);
    this.studentsResultMessage.set(null);

    const identifiers = students.map((student) => student.email);

    this.courseService.addStudents(this.courseId, identifiers).subscribe({
      next: (result: AddStudentsToCourseResult) => {
        const outcomes = result.outcomes;
        const okCount = outcomes.filter((o) => o.success).length;
        const failed = outcomes.filter((o) => !o.success);
        this.studentsResultMessage.set(
          `${okCount} de ${outcomes.length} agregados.` +
            (failed.length > 0 ? ` Fallaron: ${failed.map((f) => f.identifier).join(', ')}` : ''),
        );
        this.pendingStudents.set([]);
      },
      error: () => this.studentsErrorMessage.set('No se pudo agregar a los estudiantes.'),
    });
  }

  requestDeleteCourse(): void {
    this.deleteCourseErrorMessage.set(null);
    this.showDeleteCourseConfirm.set(true);
  }

  confirmDeleteCourse(): void {
    this.isDeletingCourse.set(true);
    this.courseService.delete(this.courseId).subscribe({
      next: () => this.router.navigateByUrl('/profesor'),
      error: () => {
        this.isDeletingCourse.set(false);
        this.deleteCourseErrorMessage.set('No se pudo eliminar el curso.');
      },
    });
  }

  cancelDeleteCourse(): void {
    this.showDeleteCourseConfirm.set(false);
    this.deleteCourseErrorMessage.set(null);
  }

  requestDeleteSection(section: SectionResult): void {
    this.deleteSectionErrorMessage.set(null);
    this.sectionToDelete.set(section);
  }

  confirmDeleteSection(): void {
    const section = this.sectionToDelete();
    if (!section) return;

    this.isDeletingSection.set(true);
    this.sectionService.delete(section.id).subscribe({
      next: () => {
        this.sections.update((current) => current.filter((s) => s.id !== section.id));
        this.activitiesBySection.update((map) => {
          const { [section.id]: _removed, ...rest } = map;
          return rest;
        });
        this.isDeletingSection.set(false);
        this.sectionToDelete.set(null);
      },
      error: () => {
        this.isDeletingSection.set(false);
        this.deleteSectionErrorMessage.set('No se pudo eliminar la sección.');
      },
    });
  }

  cancelDeleteSection(): void {
    this.sectionToDelete.set(null);
    this.deleteSectionErrorMessage.set(null);
  }

  openActivityDetail(activity: ActivityResult): void {
    this.selectedActivity.set(activity);
  }

  closeActivityDetail(): void {
    this.selectedActivity.set(null);
  }

  scopeLabel(cohortIds: string[]): string {
    if (cohortIds.length === 0) return 'Global';

    const names = this.cohorts()
      .filter((cohort) => cohortIds.includes(cohort.id))
      .map((cohort) => cohort.name);

    return names.length > 0 ? `Solo: ${names.join(', ')}` : `${cohortIds.length} ficha(s)`;
  }
}

function toggleInSet(current: Set<string>, value: string): Set<string> {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
