import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActivityResult, ActivityType } from '../models/activity.model';
import { SubmissionResult } from '../models/submission.model';

export interface CreateActivityParams {
  sectionId: string;
  title: string;
  description: string;
  dueDateUtc: string;
  type: ActivityType;
  maxFiles: number | null;
  cohortIds: string[];
  files: File[];
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/activities`;

  create(params: CreateActivityParams): Observable<ActivityResult> {
    const formData = new FormData();
    formData.append('sectionId', params.sectionId);
    formData.append('title', params.title);
    formData.append('description', params.description);
    formData.append('dueDateUtc', params.dueDateUtc);
    formData.append('type', params.type);
    if (params.maxFiles !== null) formData.append('maxFiles', String(params.maxFiles));
    for (const cohortId of params.cohortIds) formData.append('cohortIds', cohortId);
    for (const file of params.files) formData.append('files', file, file.name);

    return this.http.post<ActivityResult>(this.baseUrl, formData);
  }

  getSubmissions(activityId: string): Observable<SubmissionResult[]> {
    return this.http.get<SubmissionResult[]>(`${this.baseUrl}/${activityId}/submissions`);
  }

  downloadFile(activityId: string, storageKey: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${activityId}/files/${storageKey}`, { responseType: 'blob' });
  }

  // Devuelve null cuando el estudiante todavía no entregó (el backend responde 404 en ese caso).
  getMySubmission(activityId: string): Observable<SubmissionResult | null> {
    return this.http.get<SubmissionResult>(`${this.baseUrl}/${activityId}/my-submission`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return of(null);
        throw error;
      }),
    );
  }
}
