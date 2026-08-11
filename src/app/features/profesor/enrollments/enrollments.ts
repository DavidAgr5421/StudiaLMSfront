import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { EnrollmentResult } from '../../../core/models/enrollment.model';

@Component({
  selector: 'app-enrollments',
  imports: [RouterLink, DatePipe],
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
}
