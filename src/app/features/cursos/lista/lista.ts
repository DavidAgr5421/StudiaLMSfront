import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CourseService } from '../../../core/services/course.service';
import { CourseResult } from '../../../core/models/course.model';

// Catálogo público de cursos (RF12): visible con o sin sesión. Cualquiera puede
// buscar y ver el detalle básico; inscribirse sí requiere loguearse.
@Component({
  selector: 'app-cursos-publicos',
  imports: [FormsModule, RouterLink],
  templateUrl: './lista.html',
  styleUrl: './lista.css',
})
export class CursosPublicos {
  protected readonly courseService = inject(CourseService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly query = signal('');
  protected readonly courses = signal<CourseResult[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  private readonly queryChanges = new Subject<string>();

  constructor() {
    this.load('');

    this.queryChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => this.load(query));
  }

  private load(query: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.courseService.search(query).subscribe({
      next: (courses) => {
        this.courses.set(courses);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar los cursos.');
        this.isLoading.set(false);
      },
    });
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.queryChanges.next(value.trim());
  }
}
