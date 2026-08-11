import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Para login/register: si ya hay sesión, no tiene sentido mostrar el formulario --
// se manda directo al home de su rol.
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = authService.role();
  if (!role) return true;

  return router.createUrlTree([role === 'Profesor' || role === 'Administrador' ? '/profesor' : '/estudiante']);
};
