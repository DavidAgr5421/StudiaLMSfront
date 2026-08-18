import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentResult } from '../../../core/models/enrollment.model';
import { CourseResult } from '../../../core/models/course.model';

export interface EnrolledCourse {
  enrollment: EnrollmentResult;
  course: CourseResult;
}

@Component({
  selector: 'app-estudiante-cursos',
  imports: [RouterLink, FormsModule],
  templateUrl: './cursos.html',
  styleUrl: './cursos.css',
})
export class EstudianteCursos {
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly courseService = inject(CourseService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly enrolledCourses = signal<EnrolledCourse[]>([]);
  protected readonly pendingEnrollments = signal<EnrollmentResult[]>([]);

  protected readonly invitationCode = signal('');
  protected readonly isJoining = signal(false);
  protected readonly joinError = signal<string | null>(null);
  protected readonly joinSuccessMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  joinByCode(): void {
    const code = this.invitationCode().trim().toUpperCase();
    if (!code) return;

    this.isJoining.set(true);
    this.joinError.set(null);
    this.joinSuccessMessage.set(null);

    this.enrollmentService.enrollByInvitation(code).subscribe({
      next: () => {
        this.isJoining.set(false);
        this.invitationCode.set('');
        this.joinSuccessMessage.set('¡Listo! Te uniste al curso.');
        this.load();
      },
      error: () => {
        this.isJoining.set(false);
        this.joinError.set('No se pudo unir al curso. Verificá que el código sea correcto y que no estés ya inscrito.');
      },
    });
  }

  private load(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.enrollmentService.getMine().subscribe({
      next: (enrollments) => {
        this.pendingEnrollments.set(enrollments.filter((e) => e.status === 'Pendiente'));

        const approved = enrollments.filter((e) => e.status === 'Aprobada');
        if (approved.length === 0) {
          this.enrolledCourses.set([]);
          this.isLoading.set(false);
          return;
        }

        forkJoin(
          approved.map((enrollment) =>
            this.courseService.getById(enrollment.courseId).pipe(map((course) => ({ enrollment, course }))),
          ),
        ).subscribe({
          next: (courses) => {
            this.enrolledCourses.set(courses);
            this.isLoading.set(false);
          },
          error: () => {
            this.errorMessage.set('No se pudieron cargar tus cursos.');
            this.isLoading.set(false);
          },
        });
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar tus inscripciones.');
        this.isLoading.set(false);
      },
    });
  }
}
