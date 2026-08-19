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
import {
  ACTIVITY_KIND_ICONS,
  ACTIVITY_KIND_LABELS,
  ACTIVITY_KINDS_CREATABLE,
  ActivityKind,
  ActivityResult,
  ActivityType,
} from '../../../core/models/activity.model';
import { CohortResult } from '../../../core/models/cohort.model';
import { UserResult } from '../../../core/models/user.model';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { RichTextEditor } from '../../../shared/ui/rich-text-editor/rich-text-editor';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-course-detail',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, ConfirmDialog, RichTextEditor],
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
  protected readonly notifyMessage = signal<string | null>(null);

  protected readonly sectionCohortIds = signal<Set<string>>(new Set());
  protected readonly activityCohortIds = signal<Set<string>>(new Set());
  protected readonly activityFiles = signal<File[]>([]);
  protected readonly activityFilesErrorMessage = signal<string | null>(null);

  // Roster del curso (solo Aprobada) -- alimenta la vista previa de grupos cuando la
  // actividad es Grupal, igual que el buscador de cada ficha en la página "Fichas".
  protected readonly courseStudents = signal<UserResult[]>([]);
  protected readonly isCohortDropdownOpen = signal(false);
  protected readonly isGroupPreviewOpen = signal(false);
  protected readonly groupPreviewMode = signal<'porGrupo' | 'porEstudiante'>('porGrupo');

  protected readonly isDeletingCourse = signal(false);
  protected readonly showDeleteCourseConfirm = signal(false);
  protected readonly deleteCourseErrorMessage = signal<string | null>(null);

  protected readonly sectionToDelete = signal<SectionResult | null>(null);
  protected readonly isDeletingSection = signal(false);
  protected readonly deleteSectionErrorMessage = signal<string | null>(null);

  protected readonly activityTypes: ActivityType[] = ['SoloTexto', 'ConArchivo'];
  protected readonly activityKinds: ActivityKind[] = ACTIVITY_KINDS_CREATABLE;
  protected readonly activityKindIcons = ACTIVITY_KIND_ICONS;
  protected readonly activityKindLabels = ACTIVITY_KIND_LABELS;

  protected readonly sectionForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    descriptionHtml: [''],
    isHidden: [false],
  });

  protected readonly activityForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    dueDate: ['', Validators.required],
    openDate: [''],
    type: ['SoloTexto' as ActivityType, Validators.required],
    kind: ['Individual' as ActivityKind, Validators.required],
    maxFiles: [1],
    allowsLateSubmission: [true],
    isHidden: [false],
  });

  constructor() {
    this.loadCourse();
    this.loadSections();
    this.loadCohorts();
    this.loadCourseStudents();
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

  private loadCourseStudents(): void {
    this.courseService.getEnrollments(this.courseId).subscribe((enrollments) => {
      this.courseStudents.set(
        enrollments
          .filter((enrollment) => enrollment.status === 'Aprobada')
          .map((enrollment) => ({
            id: enrollment.studentId,
            name: enrollment.studentName,
            email: enrollment.studentEmail ?? '',
            role: 'Estudiante' as const,
            typeId: null,
            valueId: null,
          })),
      );
    });
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

  toggleCohortDropdown(): void {
    this.isCohortDropdownOpen.update((open) => !open);
  }

  toggleActivityHidden(): void {
    const control = this.activityForm.controls.isHidden;
    control.setValue(!control.value);
  }

  toggleGroupPreview(): void {
    this.isGroupPreviewOpen.update((open) => !open);
  }

  cohortDropdownSummary(): string {
    const count = this.activityCohortIds().size;
    if (count === 0) return 'Global';
    if (count === this.cohorts().length) return 'Todas las fichas';
    return `${count} ficha(s)`;
  }

  // Vista previa de grupos para actividades Grupales -- puramente informativa, la
  // membresía real de cada ficha se administra en la página "Fichas" del curso.
  groupPreviewByCohort(): { cohort: CohortResult; students: UserResult[] }[] {
    const selectedCohorts = this.cohorts().filter((cohort) => this.activityCohortIds().has(cohort.id));
    return selectedCohorts.map((cohort) => ({
      cohort,
      students: this.courseStudents().filter((student) => cohort.studentIds.includes(student.id)),
    }));
  }

  groupPreviewUnassignedStudents(): UserResult[] {
    const selectedCohorts = this.cohorts().filter((cohort) => this.activityCohortIds().has(cohort.id));
    return this.courseStudents().filter(
      (student) => !selectedCohorts.some((cohort) => cohort.studentIds.includes(student.id)),
    );
  }

  groupPreviewByStudent(): { student: UserResult; cohortNames: string[] }[] {
    const selectedCohorts = this.cohorts().filter((cohort) => this.activityCohortIds().has(cohort.id));
    return this.courseStudents().map((student) => ({
      student,
      cohortNames: selectedCohorts.filter((cohort) => cohort.studentIds.includes(student.id)).map((cohort) => cohort.name),
    }));
  }

  submitSection(): void {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }

    this.sectionErrorMessage.set(null);
    const { title, descriptionHtml, isHidden } = this.sectionForm.getRawValue();
    const cohortIds = [...this.sectionCohortIds()];

    this.sectionService.create(this.courseId, title, descriptionHtml, cohortIds, isHidden ? 'Oculto' : 'Visible').subscribe({
      next: (section) => {
        this.sections.update((current) => [...current, section]);
        this.sectionForm.reset({ title: '', descriptionHtml: '', isHidden: false });
        this.sectionCohortIds.set(new Set());
        this.isAddingSection.set(false);
      },
      error: () => this.sectionErrorMessage.set('No se pudo crear la sección.'),
    });
  }

  startAddingActivity(sectionId: string): void {
    this.activityErrorMessage.set(null);
    this.activityFilesErrorMessage.set(null);
    this.activityForm.reset({
      title: '',
      description: '',
      dueDate: '',
      openDate: '',
      type: 'SoloTexto',
      kind: 'Individual',
      maxFiles: 1,
      allowsLateSubmission: true,
      isHidden: false,
    });
    this.activityCohortIds.set(new Set());
    this.activityFiles.set([]);
    this.isCohortDropdownOpen.set(false);
    this.isGroupPreviewOpen.set(false);
    this.groupPreviewMode.set('porGrupo');
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
    const { title, description, dueDate, openDate, type, kind, maxFiles, allowsLateSubmission, isHidden } =
      this.activityForm.getRawValue();

    if (kind === 'Grupal' && this.activityCohortIds().size === 0) {
      this.activityErrorMessage.set('Una actividad Grupal necesita al menos una ficha seleccionada como grupo.');
      return;
    }

    const dueDateUtc = new Date(dueDate).toISOString();
    const openDateUtc = openDate ? new Date(openDate).toISOString() : null;

    this.activityService
      .create({
        sectionId,
        title,
        description,
        dueDateUtc,
        openDateUtc,
        type,
        kind,
        allowsLateSubmission,
        maxFiles: type === 'ConArchivo' ? maxFiles : null,
        cohortIds: [...this.activityCohortIds()],
        files: this.activityFiles(),
        status: isHidden ? 'Oculto' : 'Visible',
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
    this.router.navigate(['/actividades', activity.id]);
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
