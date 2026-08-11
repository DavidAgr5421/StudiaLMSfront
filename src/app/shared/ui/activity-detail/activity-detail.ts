import { Component, effect, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ActivityService } from '../../../core/services/activity.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { ActivityFileResult, ActivityResult } from '../../../core/models/activity.model';
import { SubmissionResult } from '../../../core/models/submission.model';
import { RichTextEditor } from '../rich-text-editor/rich-text-editor';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-activity-detail',
  imports: [DatePipe, FormsModule, RichTextEditor],
  templateUrl: './activity-detail.html',
  styleUrl: './activity-detail.css',
})
export class ActivityDetail {
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);
  private readonly submissionService = inject(SubmissionService);

  activity = input.required<ActivityResult>();
  scopeLabel = input('Global');

  closed = output<void>();

  protected readonly isStudent = () => this.authService.role() === 'Estudiante';

  protected readonly downloadingKey = signal<string | null>(null);

  protected readonly mySubmission = signal<SubmissionResult | null>(null);
  protected readonly isLoadingSubmission = signal(false);

  protected readonly submissionText = signal('');
  protected readonly submissionFiles = signal<File[]>([]);
  protected readonly submissionFilesError = signal<string | null>(null);
  protected readonly submissionDescription = signal('');
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly submitSuccess = signal(false);

  constructor() {
    effect(() => {
      const activity = this.activity();
      this.mySubmission.set(null);
      if (!this.isStudent()) return;

      this.isLoadingSubmission.set(true);
      this.activityService.getMySubmission(activity.id).subscribe({
        next: (submission) => {
          this.mySubmission.set(submission);
          this.isLoadingSubmission.set(false);
        },
        error: () => this.isLoadingSubmission.set(false),
      });
    });
  }

  download(file: ActivityFileResult): void {
    this.downloadingKey.set(file.storageKey);
    this.activityService.downloadFile(this.activity().id, file.storageKey).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.fileName;
        link.click();
        URL.revokeObjectURL(url);
        this.downloadingKey.set(null);
      },
      error: () => this.downloadingKey.set(null),
    });
  }

  onSubmissionFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const tooLarge = files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (tooLarge.length > 0) {
      this.submissionFilesError.set(`${tooLarge.map((f) => f.name).join(', ')} supera el límite de 10MB.`);
      input.value = '';
      return;
    }

    this.submissionFilesError.set(null);
    this.submissionFiles.set(files);
  }

  submit(): void {
    const activity = this.activity();
    this.submitError.set(null);
    this.isSubmitting.set(true);

    const request$ =
      activity.type === 'SoloTexto'
        ? this.submissionService.submitText(activity.id, this.submissionText())
        : this.submissionService.submitFiles(activity.id, this.submissionFiles(), this.submissionDescription());

    request$.subscribe({
      next: (submission) => {
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.mySubmission.set(submission);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set('No se pudo entregar la actividad. Puede que ya la hayas entregado antes.');
      },
    });
  }
}
