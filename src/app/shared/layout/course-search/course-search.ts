import { Component, DestroyRef, ElementRef, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { CourseResult } from '../../../core/models/course.model';

// Buscador de cursos abiertos (inscripción libre) en la topbar -- un profesor/admin
// también puede usarlo para ubicar un curso, pero solo un estudiante puede unirse
// desde acá con un clic (los de aprobación pasan por el flujo normal de solicitud).
@Component({
  selector: 'app-course-search',
  imports: [FormsModule],
  templateUrl: './course-search.html',
  styleUrl: './course-search.css',
})
export class CourseSearch {
  private readonly courseService = inject(CourseService);
  private readonly enrollmentService = inject(EnrollmentService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly results = signal<CourseResult[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly isOpen = signal(false);

  protected readonly joiningCourseId = signal<string | null>(null);
  protected readonly joinErrorId = signal<string | null>(null);

  protected readonly isEstudiante = () => this.authService.role() === 'Estudiante';

  private readonly queryChanges = new Subject<string>();

  constructor() {
    this.queryChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) return of([]);

          this.isSearching.set(true);
          return this.search(trimmed);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((courses) => {
        this.results.set(courses.filter((c) => c.enrollmentMode === 'Abierta'));
        this.isSearching.set(false);
      });
  }

  private search(query: string): Observable<CourseResult[]> {
    return this.courseService.search(query);
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.isOpen.set(true);
    if (!value.trim()) {
      this.results.set([]);
      this.isSearching.set(false);
    }
    this.queryChanges.next(value);
  }

  onFocus(): void {
    if (this.query().trim()) this.isOpen.set(true);
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.isOpen.set(false);
  }

  viewCourse(course: CourseResult): void {
    this.close();
    this.query.set('');
    this.results.set([]);
    this.router.navigate(['/cursos', course.id]);
  }

  join(course: CourseResult, event: Event): void {
    event.stopPropagation();
    this.joiningCourseId.set(course.id);
    this.joinErrorId.set(null);

    this.enrollmentService.enrollOpen(course.id).subscribe({
      next: () => {
        this.joiningCourseId.set(null);
        this.close();
        this.query.set('');
        this.results.set([]);
        this.router.navigate(['/estudiante/cursos', course.id]);
      },
      error: () => {
        this.joiningCourseId.set(null);
        this.joinErrorId.set(course.id);
      },
    });
  }
}
