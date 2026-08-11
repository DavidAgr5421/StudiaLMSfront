import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../core/services/user.service';
import { UserResult } from '../../../core/models/user.model';

@Component({
  selector: 'app-student-picker',
  imports: [FormsModule],
  templateUrl: './student-picker.html',
  styleUrl: './student-picker.css',
})
export class StudentPicker {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  // Ids a excluir de los resultados (por ejemplo, estudiantes ya elegidos por el padre).
  excludeIds = input<ReadonlySet<string>>(new Set());
  placeholder = input('Buscar por nombre o email…');

  // Si se provee, la búsqueda filtra esta lista en memoria en vez de pegarle a
  // GET /api/users/search -- para acotar el buscador a un grupo ya conocido
  // (p.ej. "solo estudiantes ya inscritos en este curso").
  candidates = input<UserResult[] | null>(null);

  picked = output<UserResult>();

  protected readonly query = signal('');
  protected readonly results = signal<UserResult[]>([]);
  protected readonly isSearching = signal(false);

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
      .subscribe((users) => {
        const excluded = this.excludeIds();
        this.results.set(users.filter((u) => u.role === 'Estudiante' && !excluded.has(u.id)));
        this.isSearching.set(false);
      });
  }

  private search(query: string): Observable<UserResult[]> {
    const candidates = this.candidates();
    if (!candidates) return this.userService.search(query);

    const needle = query.toLowerCase();
    return of(
      candidates.filter(
        (u) => (u.name?.toLowerCase().includes(needle) ?? false) || u.email.toLowerCase().includes(needle),
      ),
    );
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (!value.trim()) {
      this.results.set([]);
      this.isSearching.set(false);
    }
    this.queryChanges.next(value);
  }

  pick(user: UserResult): void {
    this.picked.emit(user);
    this.query.set('');
    this.results.set([]);
  }
}
