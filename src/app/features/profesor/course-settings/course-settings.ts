import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { CourseResult } from '../../../core/models/course.model';

const MAX_COVER_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const COLOR_PRESETS = [
  '#7C3AED', // brand (default)
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#65A30D',
  '#059669',
  '#0891B2',
  '#2563EB',
  '#DB2777',
  '#4B5563',
];

@Component({
  selector: 'app-course-settings',
  imports: [RouterLink],
  templateUrl: './course-settings.html',
  styleUrl: './course-settings.css',
})
export class CourseSettings {
  private readonly route = inject(ActivatedRoute);
  private readonly courseService = inject(CourseService);

  protected readonly courseId = this.route.snapshot.paramMap.get('courseId')!;
  protected readonly colorPresets = COLOR_PRESETS;

  protected readonly course = signal<CourseResult | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly codeCopied = signal(false);

  protected readonly colorDraft = signal('#7C3AED');
  protected readonly isSavingColor = signal(false);
  protected readonly colorSaved = signal(false);
  protected readonly colorErrorMessage = signal<string | null>(null);

  protected readonly isUploadingImage = signal(false);
  protected readonly imageErrorMessage = signal<string | null>(null);
  protected readonly isRemovingImage = signal(false);
  protected readonly coverImageCacheBust = signal(Date.now());

  constructor() {
    this.courseService.getById(this.courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.colorDraft.set(course.color ?? '#7C3AED');
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el curso.');
        this.isLoading.set(false);
      },
    });
  }

  protected coverImageUrl(): string {
    return this.courseService.getCoverImageUrl(this.courseId, this.coverImageCacheBust());
  }

  copyInvitationCode(): void {
    const code = this.course()?.invitationCode;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2000);
    });
  }

  pickColor(color: string): void {
    this.colorDraft.set(color);
  }

  saveColor(): void {
    this.colorSaved.set(false);
    this.colorErrorMessage.set(null);
    this.isSavingColor.set(true);

    this.courseService.updateColor(this.courseId, this.colorDraft()).subscribe({
      next: (course) => {
        this.course.set(course);
        this.isSavingColor.set(false);
        this.colorSaved.set(true);
        setTimeout(() => this.colorSaved.set(false), 2000);
      },
      error: () => {
        this.isSavingColor.set(false);
        this.colorErrorMessage.set('No se pudo guardar el color.');
      },
    });
  }

  onCoverImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.imageErrorMessage.set(null);

    if (!ALLOWED_COVER_IMAGE_TYPES.includes(file.type)) {
      this.imageErrorMessage.set('La imagen debe ser PNG, JPG, WEBP o GIF.');
      return;
    }
    if (file.size > MAX_COVER_IMAGE_SIZE_BYTES) {
      this.imageErrorMessage.set('La imagen supera el límite de 5MB.');
      return;
    }

    this.isUploadingImage.set(true);
    this.courseService.uploadCoverImage(this.courseId, file).subscribe({
      next: (course) => {
        this.course.set(course);
        this.coverImageCacheBust.set(Date.now());
        this.isUploadingImage.set(false);
      },
      error: () => {
        this.isUploadingImage.set(false);
        this.imageErrorMessage.set('No se pudo subir la imagen.');
      },
    });
  }

  removeCoverImage(): void {
    this.isRemovingImage.set(true);
    this.imageErrorMessage.set(null);

    this.courseService.removeCoverImage(this.courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.coverImageCacheBust.set(Date.now());
        this.isRemovingImage.set(false);
      },
      error: () => {
        this.isRemovingImage.set(false);
        this.imageErrorMessage.set('No se pudo quitar la imagen.');
      },
    });
  }
}
