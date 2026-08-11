import { Component, effect, inject, input, output, signal } from '@angular/core';
import { UserService } from '../../../core/services/user.service';
import { UserResult } from '../../../core/models/user.model';

const IDENTIFICATION_LABELS: Record<string, string> = {
  CC: 'Cédula de ciudadanía',
  TarjetaIdentidad: 'Tarjeta de identidad',
  Pasaporte: 'Pasaporte',
};

@Component({
  selector: 'app-student-info-modal',
  imports: [],
  templateUrl: './student-info-modal.html',
  styleUrl: './student-info-modal.css',
})
export class StudentInfoModal {
  private readonly userService = inject(UserService);

  userId = input.required<string>();

  closed = output<void>();

  protected readonly user = signal<UserResult | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      const userId = this.userId();
      this.isLoading.set(true);
      this.errorMessage.set(null);

      this.userService.getById(userId).subscribe({
        next: (user) => {
          this.user.set(user);
          this.isLoading.set(false);
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar la información del estudiante.');
          this.isLoading.set(false);
        },
      });
    });
  }

  identificationLabel(typeId: string): string {
    return IDENTIFICATION_LABELS[typeId] ?? typeId;
  }
}
