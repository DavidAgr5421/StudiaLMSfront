import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SubmissionResult } from '../models/submission.model';

@Injectable({ providedIn: 'root' })
export class SubmissionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/submissions`;

  grade(submissionId: string, score: number, feedback: string | null): Observable<SubmissionResult> {
    return this.http.post<SubmissionResult>(`${this.baseUrl}/${submissionId}/grade`, { score, feedback });
  }

  submitText(activityId: string, textContent: string): Observable<SubmissionResult> {
    return this.http.post<SubmissionResult>(`${this.baseUrl}/text`, { activityId, textContent });
  }

  submitFiles(activityId: string, files: File[], description?: string): Observable<SubmissionResult> {
    const formData = new FormData();
    for (const file of files) formData.append('files', file, file.name);
    if (description) formData.append('description', description);

    return this.http.post<SubmissionResult>(`${this.baseUrl}/files/${activityId}`, formData);
  }
}
