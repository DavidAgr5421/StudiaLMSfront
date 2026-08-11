import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentMode } from '../../../core/models/course.model';

@Component({
  selector: 'app-course-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './course-create.html',
  styleUrl: './course-create.css',
})
export class CourseCreate {
  private readonly fb = inject(FormBuilder);
  private readonly courseService = inject(CourseService);
  private readonly router = inject(Router);

  protected readonly enrollmentModes: EnrollmentMode[] = ['Abierta', 'ConAprobacion'];
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    enrollmentMode: ['Abierta' as EnrollmentMode, Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { name, enrollmentMode } = this.form.getRawValue();
    this.courseService.create(name, enrollmentMode).subscribe({
      next: (course) => this.router.navigate(['/profesor/cursos', course.id]),
      error: () => {
        this.errorMessage.set('No se pudo crear el curso.');
        this.isSubmitting.set(false);
      },
    });
  }
}
