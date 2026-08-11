import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ActivityService } from '../../../core/services/activity.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { SubmissionResult } from '../../../core/models/submission.model';
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
