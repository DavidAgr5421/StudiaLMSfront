import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EnrollmentResult } from '../models/enrollment.model';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/enrollments`;

  approve(enrollmentId: string): Observable<EnrollmentResult> {
    return this.http.post<EnrollmentResult>(`${this.baseUrl}/${enrollmentId}/approve`, {});
  }

  reject(enrollmentId: string): Observable<EnrollmentResult> {
    return this.http.post<EnrollmentResult>(`${this.baseUrl}/${enrollmentId}/reject`, {});
  }

  getMine(): Observable<EnrollmentResult[]> {
    return this.http.get<EnrollmentResult[]>(`${this.baseUrl}/mine`);
  }
}
