import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  imports: [],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  title = input.required<string>();
  message = input.required<string>();
  confirmLabel = input('Eliminar');
  cancelLabel = input('Cancelar');
  isProcessing = input(false);
  errorMessage = input<string | null>(null);

  confirmed = output<void>();
  cancelled = output<void>();
}
