import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { AuthService } from '../../../core/services/auth.service';
import { CourseResult } from '../../../core/models/course.model';

@Component({
  selector: 'app-curso-publico-detalle',
  imports: [RouterLink],
  templateUrl: './detalle.html',
  styleUrl: './detalle.css',
})
export class CursoPublico {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  protected readonly auth = inject(AuthService);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;

  protected readonly course = signal<CourseResult | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isJoining = signal(false);
  protected readonly joinError = signal<string | null>(null);
  protected readonly joinedCourse = signal<CourseResult | null>(null);
  protected readonly requestSent = signal(false);

  protected readonly isEstudiante = () => this.auth.role() === 'Estudiante';
  protected readonly isProfesorOrAdmin = () => this.auth.role() === 'Profesor' || this.auth.role() === 'Administrador';

  constructor() {
    this.courseService.getById(this.courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se encontró el curso.');
        this.isLoading.set(false);
      },
    });
  }

  join(): void {
    this.isJoining.set(true);
    this.joinError.set(null);

    this.enrollmentService.enrollOpen(this.courseId).subscribe({
      next: () => {
        this.isJoining.set(false);
        this.joinedCourse.set(this.course());
      },
      error: () => {
        this.isJoining.set(false);
        this.joinError.set('No se pudo completar la inscripción. Puede que ya estés inscrito.');
      },
    });
  }

  requestEnrollment(): void {
    this.isJoining.set(true);
    this.joinError.set(null);

    this.enrollmentService.requestEnrollment(this.courseId).subscribe({
      next: () => {
        this.isJoining.set(false);
        this.requestSent.set(true);
      },
      error: () => {
        this.isJoining.set(false);
        this.joinError.set('No se pudo enviar la solicitud. Puede que ya tengas una inscripción para este curso.');
      },
    });
  }
}
