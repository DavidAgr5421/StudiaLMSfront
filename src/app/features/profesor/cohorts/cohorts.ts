import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CohortService } from '../../../core/services/cohort.service';
import { CourseService } from '../../../core/services/course.service';
import { CohortResult } from '../../../core/models/cohort.model';
import { UserResult } from '../../../core/models/user.model';
import { StudentPicker } from '../../../shared/ui/student-picker/student-picker';

@Component({
  selector: 'app-cohorts',
  imports: [ReactiveFormsModule, RouterLink, StudentPicker],
  templateUrl: './cohorts.html',
  styleUrl: './cohorts.css',
})
export class Cohorts {
  private readonly route = inject(ActivatedRoute);
  private readonly cohortService = inject(CohortService);
  private readonly courseService = inject(CourseService);
  private readonly fb = inject(FormBuilder);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;

  protected readonly cohorts = signal<CohortResult[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  // Solo se puede asignar a una ficha a alguien ya inscrito en el curso -- el buscador
  // de cada ficha filtra este roster en vez de buscar entre todos los usuarios.
  protected readonly courseStudents = signal<UserResult[]>([]);

  protected readonly pendingStudentsByCohort = signal<Record<string, UserResult[]>>({});
  protected readonly assignErrors = signal<Record<string, string>>({});
  protected readonly assigningCohortId = signal<string | null>(null);

  protected readonly cohortForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  constructor() {
    this.loadCohorts();
    this.loadCourseStudents();
  }

  private loadCohorts(): void {
    this.isLoading.set(true);
    this.cohortService.getByCourse(this.courseId).subscribe({
      next: (cohorts) => {
        this.cohorts.set(cohorts);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las fichas.');
        this.isLoading.set(false);
      },
    });
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

  createCohort(): void {
    if (this.cohortForm.invalid) {
      this.cohortForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    const { name } = this.cohortForm.getRawValue();

    this.cohortService.create(this.courseId, name).subscribe({
      next: (cohort) => {
        this.cohorts.update((current) => [...current, cohort]);
        this.cohortForm.reset({ name: '' });
      },
      error: () => this.errorMessage.set('No se pudo crear la ficha.'),
    });
  }

  pendingStudentsFor(cohortId: string): UserResult[] {
    return this.pendingStudentsByCohort()[cohortId] ?? [];
  }

  pendingIdsFor(cohortId: string): ReadonlySet<string> {
    return new Set(this.pendingStudentsFor(cohortId).map((student) => student.id));
  }

  onStudentPicked(cohortId: string, student: UserResult): void {
    this.pendingStudentsByCohort.update((current) => ({
      ...current,
      [cohortId]: [...(current[cohortId] ?? []), student],
    }));
  }

  removePendingStudent(cohortId: string, studentId: string): void {
    this.pendingStudentsByCohort.update((current) => ({
      ...current,
      [cohortId]: (current[cohortId] ?? []).filter((student) => student.id !== studentId),
    }));
  }

  submitPendingStudents(cohortId: string): void {
    const students = this.pendingStudentsFor(cohortId);
    if (students.length === 0) return;

    this.setAssignError(cohortId, null);
    this.assigningCohortId.set(cohortId);

    const identifiers = students.map((student) => student.email);

    this.cohortService.assignStudents(cohortId, identifiers).subscribe({
      next: (result) => {
        this.cohorts.update((current) => current.map((c) => (c.id === result.cohort.id ? result.cohort : c)));

        const failed = result.outcomes.filter((outcome) => !outcome.success);
        if (failed.length > 0) {
          this.setAssignError(
            cohortId,
            `${failed.length} de ${result.outcomes.length} no se pudieron asignar: ` +
              failed.map((outcome) => outcome.errorMessage ?? outcome.identifier).join('; '),
          );
        }

        this.pendingStudentsByCohort.update((current) => ({ ...current, [cohortId]: [] }));
        this.assigningCohortId.set(null);
      },
      error: () => {
        this.setAssignError(cohortId, 'No se pudo asignar a los estudiantes.');
        this.assigningCohortId.set(null);
      },
    });
  }

  private setAssignError(cohortId: string, message: string | null): void {
    this.assignErrors.update((current) => {
      const next = { ...current };
      if (message) next[cohortId] = message;
      else delete next[cohortId];
      return next;
    });
  }
}
