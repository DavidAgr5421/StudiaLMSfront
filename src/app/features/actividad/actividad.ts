import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { SubmissionService } from '../../core/services/submission.service';
import { CohortService } from '../../core/services/cohort.service';
import { ActivityFileResult, ActivityResult } from '../../core/models/activity.model';
import { SubmissionResult } from '../../core/models/submission.model';
import { RichTextEditor } from '../../shared/ui/rich-text-editor/rich-text-editor';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PREVIEWABLE_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const PDF_EXTENSION = '.pdf';

type FilePreviewKind = 'image' | 'pdf';
interface FilePreview {
  kind: FilePreviewKind;
  objectUrl: string;
  // Los <img src> aceptan un string común; un <iframe src> exige un SafeResourceUrl
  // explícito o Angular lo bloquea por sanitización.
  src: string | SafeResourceUrl;
}

function previewKind(fileName: string): FilePreviewKind | null {
  const lower = fileName.toLowerCase();
  if (PREVIEWABLE_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'image';
  if (lower.endsWith(PDF_EXTENSION)) return 'pdf';
  return null;
}

@Component({
  selector: 'app-actividad',
  imports: [DatePipe, FormsModule, RichTextEditor],
  templateUrl: './actividad.html',
  styleUrl: './actividad.css',
})
export class Actividad implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly authService = inject(AuthService);
  private readonly activityService = inject(ActivityService);
  private readonly submissionService = inject(SubmissionService);
  private readonly cohortService = inject(CohortService);

  protected readonly activityId = this.route.snapshot.paramMap.get('activityId')!;

  protected readonly activity = signal<ActivityResult | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scopeLabel = signal('Global');

  protected readonly isStudent = () => this.authService.role() === 'Estudiante';
  private readonly isProfesor = () => {
    const role = this.authService.role();
    return role === 'Profesor' || role === 'Administrador';
  };

  protected readonly filePreviews = signal<Record<string, FilePreview>>({});
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
    this.activityService.getById(this.activityId).subscribe({
      next: (activity) => {
        this.activity.set(activity);
        this.isLoading.set(false);
        this.resolveScopeLabel(activity);
        this.loadFilePreviews(activity);
        if (this.isStudent()) this.loadMySubmission(activity.id);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar la actividad.');
        this.isLoading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    for (const preview of Object.values(this.filePreviews())) {
      URL.revokeObjectURL(preview.objectUrl);
    }
  }

  goBack(): void {
    this.location.back();
  }

  private resolveScopeLabel(activity: ActivityResult): void {
    if (activity.cohortIds.length === 0) {
      this.scopeLabel.set('Global');
      return;
    }

    // Los nombres de fichas solo los puede pedir Profesor/Administrador -- un estudiante
    // ve un rótulo genérico en vez de los nombres exactos.
    if (!this.isProfesor() || !activity.courseId) {
      this.scopeLabel.set(`${activity.cohortIds.length} ficha(s)`);
      return;
    }

    this.cohortService.getByCourse(activity.courseId).subscribe({
      next: (cohorts) => {
        const names = cohorts.filter((c) => activity.cohortIds.includes(c.id)).map((c) => c.name);
        this.scopeLabel.set(names.length > 0 ? `Solo: ${names.join(', ')}` : `${activity.cohortIds.length} ficha(s)`);
      },
      error: () => this.scopeLabel.set(`${activity.cohortIds.length} ficha(s)`),
    });
  }

  private loadMySubmission(activityId: string): void {
    this.isLoadingSubmission.set(true);
    this.activityService.getMySubmission(activityId).subscribe({
      next: (submission) => {
        this.mySubmission.set(submission);
        this.isLoadingSubmission.set(false);
      },
      error: () => this.isLoadingSubmission.set(false),
    });
  }

  // Trae de una las imágenes y PDFs como blob para mostrarlos inline -- el resto de los
  // tipos de archivo se quedan como fila de descarga nomás.
  private loadFilePreviews(activity: ActivityResult): void {
    for (const file of activity.files) {
      const kind = previewKind(file.fileName);
      if (!kind) continue;

      this.activityService.downloadFile(activity.id, file.storageKey).subscribe({
        next: (blob) => {
          const objectUrl = URL.createObjectURL(blob);
          const src = kind === 'pdf' ? this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl) : objectUrl;
          this.filePreviews.update((current) => ({ ...current, [file.storageKey]: { kind, objectUrl, src } }));
        },
        error: () => {},
      });
    }
  }

  download(file: ActivityFileResult): void {
    const activity = this.activity();
    if (!activity) return;

    this.downloadingKey.set(file.storageKey);
    this.activityService.downloadFile(activity.id, file.storageKey).subscribe({
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
    if (!activity) return;

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
