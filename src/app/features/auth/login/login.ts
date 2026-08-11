import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>((history.state as { message?: string })?.message ?? null);
  protected readonly isSubmitting = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);

      const role = this.auth.role();
      const destination = role === 'Profesor' || role === 'Administrador' ? '/profesor' : '/estudiante';
      this.router.navigateByUrl(destination);
    } catch {
      this.errorMessage.set('Credenciales inválidas. Verificá tu email y contraseña.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
