import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { UserResult } from '../models/user.model';

// Perfil completo del usuario logueado (con nombre e identificación), separado de
// AuthService.currentUser() -- ese guarda solo lo que devuelve /auth/login (sin
// nombre) y no cambia si el usuario edita su perfil. Este servicio se repuebla solo
// al iniciar sesión y se actualiza a mano cuando "Mi perfil" guarda un cambio, para
// que la topbar siempre muestre el nombre más reciente.
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  readonly user = signal<UserResult | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.userService.getMe().subscribe({
          next: (user) => this.user.set(user),
          error: () => this.user.set(null),
        });
      } else {
        this.user.set(null);
      }
    });
  }

  set(user: UserResult): void {
    this.user.set(user);
  }
}
