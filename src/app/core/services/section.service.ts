import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SectionResult } from '../models/section.model';
import { ActivityResult } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sections`;

  create(courseId: string, title: string, descriptionHtml: string, cohortIds: string[] = []): Observable<SectionResult> {
    return this.http.post<SectionResult>(this.baseUrl, { courseId, title, descriptionHtml, cohortIds });
  }

  getActivities(sectionId: string): Observable<ActivityResult[]> {
    return this.http.get<ActivityResult[]>(`${this.baseUrl}/${sectionId}/activities`);
  }

  delete(sectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${sectionId}`);
  }
}
