import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { EnrollmentResult, AddStudentsToCourseResult } from '../../../core/models/enrollment.model';
import { UserResult } from '../../../core/models/user.model';
import { StudentPicker } from '../../../shared/ui/student-picker/student-picker';
import { StudentInfoModal } from '../../../shared/ui/student-info-modal/student-info-modal';

@Component({
  selector: 'app-enrollments',
  imports: [RouterLink, DatePipe, StudentPicker, StudentInfoModal],
  templateUrl: './enrollments.html',
  styleUrl: './enrollments.css',
})
export class Enrollments {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;
  protected readonly enrollments = signal<EnrollmentResult[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly processingId = signal<string | null>(null);

  protected readonly pending = () => this.enrollments().filter((e) => e.status === 'Pendiente');
  protected readonly decided = () => this.enrollments().filter((e) => e.status !== 'Pendiente');

  // Agregar estudiantes directamente (RF11) -- mismo flujo que antes vivía en course-detail,
  // ahora acá para que "quién está inscrito" y "agregar a alguien" queden juntos.
  protected readonly pendingStudents = signal<UserResult[]>([]);
  protected readonly studentsErrorMessage = signal<string | null>(null);
  protected readonly studentsResultMessage = signal<string | null>(null);
  protected readonly isSubmittingStudents = signal(false);

  protected readonly selectedStudentId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.courseService.getEnrollments(this.courseId).subscribe({
      next: (enrollments) => {
        this.enrollments.set(enrollments);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las inscripciones.');
        this.isLoading.set(false);
      },
    });
  }

  approve(enrollmentId: string): void {
    this.processingId.set(enrollmentId);
    this.enrollmentService.approve(enrollmentId).subscribe({
      next: (updated) => this.replaceEnrollment(updated),
      error: () => this.processingId.set(null),
    });
  }

  reject(enrollmentId: string): void {
    this.processingId.set(enrollmentId);
    this.enrollmentService.reject(enrollmentId).subscribe({
      next: (updated) => this.replaceEnrollment(updated),
      error: () => this.processingId.set(null),
    });
  }

  private replaceEnrollment(updated: EnrollmentResult): void {
    this.enrollments.update((current) => current.map((e) => (e.id === updated.id ? updated : e)));
    this.processingId.set(null);
  }

  displayName(enrollment: EnrollmentResult): string {
    return enrollment.studentName || enrollment.studentEmail || `Estudiante ${enrollment.studentId}`;
  }

  pendingStudentIds(): ReadonlySet<string> {
    const alreadyEnrolled = this.enrollments()
      .filter((e) => e.status !== 'Rechazada')
      .map((e) => e.studentId);
    return new Set([...this.pendingStudents().map((student) => student.id), ...alreadyEnrolled]);
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
    this.isSubmittingStudents.set(true);

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
        this.isSubmittingStudents.set(false);
        this.load();
      },
      error: () => {
        this.isSubmittingStudents.set(false);
        this.studentsErrorMessage.set('No se pudo agregar a los estudiantes.');
      },
    });
  }

  viewStudent(studentId: string): void {
    this.selectedStudentId.set(studentId);
  }

  closeStudentInfo(): void {
    this.selectedStudentId.set(null);
  }
}
