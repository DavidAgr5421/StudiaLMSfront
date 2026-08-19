import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DatePipe, Location, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { SubmissionService } from '../../core/services/submission.service';
import { CohortService } from '../../core/services/cohort.service';
import { ACTIVITY_KIND_ICONS, ACTIVITY_KIND_LABELS, ActivityFileResult, ActivityResult } from '../../core/models/activity.model';
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
  imports: [DatePipe, FormsModule, RichTextEditor, NgTemplateOutlet, RouterLink],
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

  protected readonly activityKindIcons = ACTIVITY_KIND_ICONS;
  protected readonly activityKindLabels = ACTIVITY_KIND_LABELS;

  protected readonly isStudent = () => this.authService.role() === 'Estudiante';
  protected readonly isProfesor = () => {
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

  protected readonly isEditingSubmission = signal(false);

  protected canEditSubmission(): boolean {
    const submission = this.mySubmission();
    const activity = this.activity();
    if (!submission || !activity) return false;
    return activity.acceptsSubmissions;
  }

  // "Entregado" / "Sin entregar" / "Tarde para entregar" / "Bloqueada" -- ver spec de
  // Estado de la Entrega. No hay estado "Calificado" acá, eso es aparte (gradeStateLabel).
  protected submissionStateLabel(activity: ActivityResult, submission: SubmissionResult | null): string {
    if (!submission) return activity.acceptsSubmissions ? 'Sin entregar' : 'Bloqueada';
    return submission.status === 'Tardia' ? 'Entregado tarde' : 'Entregado a tiempo';
  }

  protected gradeStateLabel(submission: SubmissionResult): string {
    return submission.score !== null ? 'Calificado' : 'Sin calificar';
  }

  // Cuenta regresiva/estado de la fecha límite -- estática al cargar la página, igual que
  // isOverdue() en el listado de cursos (no hace falta que "tickee" en vivo).
  protected timeRemainingLabel(activity: ActivityResult): string {
    if (activity.isManuallyClosed) return 'Cerrada por el profesor';

    const msRemaining = new Date(activity.dueDateUtc).getTime() - Date.now();
    if (msRemaining <= 0) {
      return activity.allowsLateSubmission ? 'Vencida (todavía acepta entregas tardías)' : 'Vencida (ya no acepta entregas)';
    }

    const hours = Math.floor(msRemaining / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days >= 1) return `Quedan ${days} día(s)`;
    if (hours >= 1) return `Quedan ${hours} hora(s)`;
    return 'Quedan menos de 1 hora';
  }

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

  startEditSubmission(): void {
    const submission = this.mySubmission();
    const activity = this.activity();
    if (!submission || !activity) return;

    if (activity.type === 'SoloTexto') {
      this.submissionText.set(submission.textContent ?? '');
    } else {
      this.submissionDescription.set(submission.textContent ?? '');
    }
    this.submissionFiles.set([]);
    this.submissionFilesError.set(null);
    this.submitError.set(null);
    this.submitSuccess.set(false);
    this.isEditingSubmission.set(true);
  }

  cancelEditSubmission(): void {
    this.isEditingSubmission.set(false);
  }

  submit(): void {
    const activity = this.activity();
    if (!activity) return;

    const editing = this.isEditingSubmission();
    const submissionId = this.mySubmission()?.id;

    this.submitError.set(null);
    this.isSubmitting.set(true);

    const request$ =
      editing && submissionId
        ? activity.type === 'SoloTexto'
          ? this.submissionService.editText(submissionId, this.submissionText())
          : this.submissionService.editFiles(submissionId, this.submissionFiles(), this.submissionDescription())
        : activity.type === 'SoloTexto'
          ? this.submissionService.submitText(activity.id, this.submissionText())
          : this.submissionService.submitFiles(activity.id, this.submissionFiles(), this.submissionDescription());

    request$.subscribe({
      next: (submission) => {
        this.isSubmitting.set(false);
        this.submitSuccess.set(true);
        this.mySubmission.set(submission);
        this.isEditingSubmission.set(false);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.submitError.set(
          editing ? 'No se pudo editar la entrega.' : 'No se pudo entregar la actividad. Puede que ya la hayas entregado antes.',
        );
      },
    });
  }
}
