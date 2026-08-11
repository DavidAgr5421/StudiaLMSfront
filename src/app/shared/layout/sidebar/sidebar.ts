import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { SectionService } from '../../../core/services/section.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { CourseResult } from '../../../core/models/course.model';
import { SectionResult } from '../../../core/models/section.model';
import { ActivityResult } from '../../../core/models/activity.model';
import { EnrollmentResult } from '../../../core/models/enrollment.model';
import { ActivityDetail } from '../../ui/activity-detail/activity-detail';

interface EnrolledCourse {
  enrollment: EnrollmentResult;
  course: CourseResult;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, NgTemplateOutlet, ActivityDetail],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  private readonly authService = inject(AuthService);
  private readonly courseService = inject(CourseService);
  private readonly sectionService = inject(SectionService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly router = inject(Router);

  protected readonly isProfesor = () => {
    const role = this.authService.role();
    return role === 'Profesor' || role === 'Administrador';
  };
  protected readonly isEstudiante = () => this.authService.role() === 'Estudiante';

  // Profesor: cursos que creó.
  protected readonly profesorCourses = signal<CourseResult[]>([]);

  // Estudiante: separado por estado -- solo los aprobados se pueden explorar.
  protected readonly approvedCourses = signal<EnrolledCourse[]>([]);
  protected readonly pendingCourses = signal<EnrolledCourse[]>([]);

  protected readonly isLoading = signal(true);

  // Caches compartidas: una sección/actividad se pide una sola vez sin importar
  // cuántas ramas del árbol (Secciones/Calificaciones) la muestren.
  protected readonly sectionsByCourse = signal<Record<string, SectionResult[]>>({});
  protected readonly activitiesBySection = signal<Record<string, ActivityResult[]>>({});

  // Un solo set de claves expandidas describe todo el árbol, sin importar la
  // profundidad -- "c:{id}", "c:{id}:secciones", "c:{id}:secciones:s:{id}", etc.
  protected readonly expandedKeys = signal<Set<string>>(new Set());

  protected readonly selectedActivity = signal<ActivityResult | null>(null);

  constructor() {
    if (this.isProfesor()) {
      this.courseService.getMine().subscribe({
        next: (courses) => {
          this.profesorCourses.set(courses);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
    } else if (this.isEstudiante()) {
      this.loadEstudianteCourses();
    } else {
      this.isLoading.set(false);
    }
  }

  private loadEstudianteCourses(): void {
    this.enrollmentService.getMine().subscribe({
      next: (enrollments) => {
        const relevant = enrollments.filter((e) => e.status === 'Aprobada' || e.status === 'Pendiente');
        if (relevant.length === 0) {
          this.isLoading.set(false);
          return;
        }

        forkJoin(
          relevant.map((enrollment) =>
            this.courseService.getById(enrollment.courseId).pipe(map((course) => ({ enrollment, course }))),
          ),
        ).subscribe({
          next: (items) => {
            this.approvedCourses.set(items.filter((i) => i.enrollment.status === 'Aprobada'));
            this.pendingCourses.set(items.filter((i) => i.enrollment.status === 'Pendiente'));
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
      },
      error: () => this.isLoading.set(false),
    });
  }

  isExpanded(key: string): boolean {
    return this.expandedKeys().has(key);
  }

  toggle(key: string): void {
    this.expandedKeys.update((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  loadSections(courseId: string): void {
    if (this.sectionsByCourse()[courseId]) return;

    this.courseService.getSections(courseId).subscribe((sections) => {
      this.sectionsByCourse.update((map) => ({ ...map, [courseId]: sections }));
    });
  }

  loadActivities(sectionId: string): void {
    if (this.activitiesBySection()[sectionId]) return;

    this.sectionService.getActivities(sectionId).subscribe((activities) => {
      this.activitiesBySection.update((map) => ({ ...map, [sectionId]: activities }));
    });
  }

  toggleSectionsBranch(key: string, courseId: string): void {
    this.toggle(key);
    if (this.isExpanded(key)) this.loadSections(courseId);
  }

  toggleSectionNode(key: string, sectionId: string): void {
    this.toggle(key);
    if (this.isExpanded(key)) this.loadActivities(sectionId);
  }

  onActivityClick(activity: ActivityResult, mode: 'view' | 'grade'): void {
    if (mode === 'grade') this.router.navigate(['/profesor/actividades', activity.id, 'entregas']);
    else this.selectedActivity.set(activity);
  }

  closeActivity(): void {
    this.selectedActivity.set(null);
  }
}
