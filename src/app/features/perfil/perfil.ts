import { Component, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CurrentUserService } from '../../core/services/current-user.service';
import { IdentificationType, UserResult } from '../../core/models/user.model';

const IDENTIFICATION_TYPES: { value: IdentificationType; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TarjetaIdentidad', label: 'Tarjeta de identidad' },
  { value: 'Pasaporte', label: 'Pasaporte' },
];

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, NgTemplateOutlet],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly user = signal<UserResult | null>(null);
  protected readonly isLoading = signal(true);

  protected readonly initials = () => {
    const u = this.user();
    const name = u?.name || u?.email || '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase() || '?';
  };

  protected readonly nameForm = this.fb.nonNullable.group({
    name: [''],
  });
  protected readonly isSavingName = signal(false);
  protected readonly nameSuccessMessage = signal<string | null>(null);
  protected readonly nameErrorMessage = signal<string | null>(null);

  protected readonly emailForm = this.fb.nonNullable.group({
    newEmail: ['', [Validators.required, Validators.email]],
    currentPassword: ['', Validators.required],
  });
  protected readonly isSavingEmail = signal(false);
  protected readonly emailErrorMessage = signal<string | null>(null);

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });
  protected readonly isSavingPassword = signal(false);
  protected readonly passwordErrorMessage = signal<string | null>(null);
  protected readonly showEmailCurrentPassword = signal(false);
  protected readonly showCurrentPassword = signal(false);
  protected readonly showNewPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  protected readonly identificationTypes = IDENTIFICATION_TYPES;
  protected readonly identificationForm = this.fb.nonNullable.group({
    typeId: ['CC' as IdentificationType, Validators.required],
    valueId: ['', Validators.required],
  });
  protected readonly isSavingIdentification = signal(false);
  protected readonly identificationSuccessMessage = signal<string | null>(null);
  protected readonly identificationErrorMessage = signal<string | null>(null);

  constructor() {
    this.userService.getMe().subscribe({
      next: (user) => {
        this.user.set(user);
        this.nameForm.setValue({ name: user.name ?? '' });
        this.identificationForm.setValue({
          typeId: user.typeId ?? 'CC',
          valueId: user.valueId ?? '',
        });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  saveName(): void {
    if (this.nameForm.invalid) return;

    this.nameSuccessMessage.set(null);
    this.nameErrorMessage.set(null);
    this.isSavingName.set(true);

    const { name } = this.nameForm.getRawValue();

    this.userService.updateName(name.trim() || null).subscribe({
      next: (user) => {
        this.user.set(user);
        this.currentUserService.set(user);
        this.isSavingName.set(false);
        this.nameSuccessMessage.set('Nombre actualizado.');
      },
      error: () => {
        this.isSavingName.set(false);
        this.nameErrorMessage.set('No se pudo actualizar el nombre.');
      },
    });
  }

  saveEmail(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.emailErrorMessage.set(null);
    this.isSavingEmail.set(true);

    const { newEmail, currentPassword } = this.emailForm.getRawValue();

    this.userService.changeEmail(newEmail, currentPassword).subscribe({
      next: () => this.signOutAfterCredentialChange('Tu email fue actualizado. Iniciá sesión de nuevo.'),
      error: () => {
        this.isSavingEmail.set(false);
        this.emailErrorMessage.set('No se pudo cambiar el email. Verificá tu contraseña actual y que el email no esté en uso.');
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordErrorMessage.set('Las contraseñas nuevas no coinciden.');
      return;
    }

    this.passwordErrorMessage.set(null);
    this.isSavingPassword.set(true);

    this.userService.changePassword(currentPassword, newPassword).subscribe({
      next: () => this.signOutAfterCredentialChange('Tu contraseña fue actualizada. Iniciá sesión de nuevo.'),
      error: () => {
        this.isSavingPassword.set(false);
        this.passwordErrorMessage.set('No se pudo cambiar la contraseña. Verificá tu contraseña actual.');
      },
    });
  }

  saveIdentification(): void {
    if (this.identificationForm.invalid) {
      this.identificationForm.markAllAsTouched();
      return;
    }

    this.identificationSuccessMessage.set(null);
    this.identificationErrorMessage.set(null);
    this.isSavingIdentification.set(true);

    const { typeId, valueId } = this.identificationForm.getRawValue();

    this.userService.setIdentification(typeId, valueId.trim()).subscribe({
      next: (user) => {
        this.user.set(user);
        this.isSavingIdentification.set(false);
        this.identificationSuccessMessage.set('Documento de identidad actualizado.');
      },
      error: () => {
        this.isSavingIdentification.set(false);
        this.identificationErrorMessage.set('No se pudo actualizar el documento de identidad.');
      },
    });
  }

  private async signOutAfterCredentialChange(message: string): Promise<void> {
    await this.authService.logout();
    this.router.navigateByUrl('/login', { state: { message } });
  }
}
