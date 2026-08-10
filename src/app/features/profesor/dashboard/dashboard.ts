import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { CourseResult } from '../../../core/models/course.model';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, ConfirmDialog],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly courseService = inject(CourseService);

  protected readonly courses = signal<CourseResult[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly courseToDelete = signal<CourseResult | null>(null);
  protected readonly isDeleting = signal(false);
  protected readonly deleteErrorMessage = signal<string | null>(null);

  constructor() {
    this.loadCourses();
  }

  private loadCourses(): void {
    this.isLoading.set(true);
    this.courseService.getMine().subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar tus cursos.');
        this.isLoading.set(false);
      },
    });
  }

  requestDelete(course: CourseResult, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.deleteErrorMessage.set(null);
    this.courseToDelete.set(course);
  }

  confirmDelete(): void {
    const course = this.courseToDelete();
    if (!course) return;

    this.isDeleting.set(true);
    this.courseService.delete(course.id).subscribe({
      next: () => {
        this.courses.update((current) => current.filter((c) => c.id !== course.id));
        this.isDeleting.set(false);
        this.courseToDelete.set(null);
      },
      error: () => {
        this.isDeleting.set(false);
        this.deleteErrorMessage.set('No se pudo eliminar el curso.');
      },
    });
  }

  cancelDelete(): void {
    this.courseToDelete.set(null);
    this.deleteErrorMessage.set(null);
  }
}
