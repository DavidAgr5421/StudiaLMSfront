import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignStudentsToCohortResult, CohortResult } from '../models/cohort.model';

@Injectable({ providedIn: 'root' })
export class CohortService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/cohorts`;

  create(courseId: string, name: string): Observable<CohortResult> {
    return this.http.post<CohortResult>(this.baseUrl, { courseId, name });
  }

  assignStudents(cohortId: string, studentIdentifiers: string[]): Observable<AssignStudentsToCohortResult> {
    return this.http.post<AssignStudentsToCohortResult>(`${this.baseUrl}/${cohortId}/students`, {
      studentIdentifiers,
    });
  }

  getByCourse(courseId: string): Observable<CohortResult[]> {
    return this.http.get<CohortResult[]>(`${environment.apiUrl}/courses/${courseId}/cohorts`);
  }
}
