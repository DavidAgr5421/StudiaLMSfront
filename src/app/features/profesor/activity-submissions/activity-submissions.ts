import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ActivityService } from '../../../core/services/activity.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { SubmissionResult, SubmittedFileResult } from '../../../core/models/submission.model';
import { StudentInfoModal } from '../../../shared/ui/student-info-modal/student-info-modal';

@Component({
  selector: 'app-activity-submissions',
  imports: [RouterLink, DatePipe, FormsModule, StudentInfoModal],
  templateUrl: './activity-submissions.html',
  styleUrl: './activity-submissions.css',
})
export class ActivitySubmissions {
  private readonly route = inject(ActivatedRoute);
  private readonly activityService = inject(ActivityService);
  private readonly submissionService = inject(SubmissionService);

  protected readonly activityId = this.route.snapshot.paramMap.get('activityId')!;
  protected readonly submissions = signal<SubmissionResult[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly scoreDraft = signal<Record<string, number>>({});
  protected readonly feedbackDraft = signal<Record<string, string>>({});
  protected readonly gradingId = signal<string | null>(null);

  protected readonly selectedStudentId = signal<string | null>(null);
  protected readonly downloadingKey = signal<string | null>(null);

  // Búsqueda/filtros: puramente en memoria, la lista de entregas de una actividad no
  // amerita paginar ni pegarle al backend de nuevo por esto.
  protected readonly searchQuery = signal('');
  protected readonly statusFilter = signal<'all' | 'ATiempo' | 'Tardia'>('all');
  protected readonly groupFilter = signal('all');

  // Solo tiene opciones en actividades Grupales (ahí sí cada entrega trae groupName) --
  // en Individual queda vacío y el filtro de grupo ni se muestra.
  protected readonly availableGroups = computed(() => {
    const names = new Set(this.submissions().map((s) => s.groupName).filter((name) => !!name));
    return [...names].sort();
  });

  protected readonly filteredSubmissions = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    const group = this.groupFilter();

    return this.submissions().filter((submission) => {
      if (status !== 'all' && submission.status !== status) return false;
      if (group !== 'all' && submission.groupName !== group) return false;
      if (query) {
        const name = (submission.studentName ?? submission.studentId).toLowerCase();
        if (!name.includes(query)) return false;
      }
      return true;
    });
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.activityService.getSubmissions(this.activityId).subscribe({
      next: (submissions) => {
        this.submissions.set(submissions);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudieron cargar las entregas.');
        this.isLoading.set(false);
      },
    });
  }

  setScore(submissionId: string, score: number): void {
    this.scoreDraft.update((current) => ({ ...current, [submissionId]: score }));
  }

  setFeedback(submissionId: string, feedback: string): void {
    this.feedbackDraft.update((current) => ({ ...current, [submissionId]: feedback }));
  }

  download(submissionId: string, file: SubmittedFileResult): void {
    this.downloadingKey.set(file.storageKey);
    this.submissionService.downloadFile(submissionId, file.storageKey).subscribe({
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

  viewStudent(studentId: string): void {
    this.selectedStudentId.set(studentId);
  }

  closeStudentInfo(): void {
    this.selectedStudentId.set(null);
  }

  grade(submission: SubmissionResult): void {
    const score = this.scoreDraft()[submission.id] ?? submission.score ?? 0;
    const feedback = this.feedbackDraft()[submission.id] ?? submission.feedback ?? '';

    this.gradingId.set(submission.id);
    this.submissionService.grade(submission.id, score, feedback || null).subscribe({
      next: (updated) => {
        this.submissions.update((current) => current.map((s) => (s.id === updated.id ? updated : s)));
        this.gradingId.set(null);
      },
      error: () => this.gradingId.set(null),
    });
  }
}
