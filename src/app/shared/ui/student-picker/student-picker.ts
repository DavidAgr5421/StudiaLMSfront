import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
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
  placeholder = input('Buscar por nombre, email o cédula…');

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
    // Sin texto todavía escrito, mostramos directamente el roster (candidates) en vez de
    // una lista vacía -- así el profesor ve de una a quién puede asignar, sin tener que
    // adivinar un nombre para arrancar. Reacciona también si candidates() llega después
    // (carga async del roster del curso) mientras el buscador sigue vacío.
    effect(() => {
      const candidates = this.candidates();
      if (candidates && !this.query().trim()) {
        this.results.set(this.applyExclusions(candidates));
      }
    });

    this.queryChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = query.trim();
          if (!trimmed) return of(this.candidates() ?? []);

          this.isSearching.set(true);
          return this.search(trimmed);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((users) => {
        this.results.set(this.applyExclusions(users));
        this.isSearching.set(false);
      });
  }

  private applyExclusions(users: UserResult[]): UserResult[] {
    const excluded = this.excludeIds();
    return users.filter((u) => u.role === 'Estudiante' && !excluded.has(u.id));
  }

  private search(query: string): Observable<UserResult[]> {
    const candidates = this.candidates();
    if (!candidates) return this.userService.search(query);

    const needle = query.toLowerCase();
    return of(
      candidates.filter(
        (u) =>
          (u.name?.toLowerCase().includes(needle) ?? false) ||
          u.email.toLowerCase().includes(needle) ||
          (u.valueId?.toLowerCase().includes(needle) ?? false),
      ),
    );
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    if (!value.trim()) {
      this.results.set(this.applyExclusions(this.candidates() ?? []));
      this.isSearching.set(false);
      return;
    }
    this.queryChanges.next(value);
  }

  pick(user: UserResult): void {
    this.picked.emit(user);
    this.query.set('');
    this.results.set([]);
  }
}
