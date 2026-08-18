import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CourseResult, EnrollmentMode } from '../models/course.model';
import { SectionResult } from '../models/section.model';
import { AddStudentsToCourseResult, EnrollmentResult } from '../models/enrollment.model';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/courses`;

  create(name: string, enrollmentMode: EnrollmentMode): Observable<CourseResult> {
    return this.http.post<CourseResult>(this.baseUrl, { name, enrollmentMode });
  }

  getMine(): Observable<CourseResult[]> {
    return this.http.get<CourseResult[]>(`${this.baseUrl}/mine`);
  }

  search(query: string): Observable<CourseResult[]> {
    return this.http.get<CourseResult[]>(`${this.baseUrl}/search`, { params: { q: query } });
  }

  getById(courseId: string): Observable<CourseResult> {
    return this.http.get<CourseResult>(`${this.baseUrl}/${courseId}`);
  }

  getSections(courseId: string): Observable<SectionResult[]> {
    return this.http.get<SectionResult[]>(`${this.baseUrl}/${courseId}/sections`);
  }

  addStudents(courseId: string, studentIdentifiers: string[]): Observable<AddStudentsToCourseResult> {
    return this.http.post<AddStudentsToCourseResult>(`${this.baseUrl}/${courseId}/students`, {
      studentIdentifiers,
    });
  }

  getEnrollments(courseId: string): Observable<EnrollmentResult[]> {
    return this.http.get<EnrollmentResult[]>(`${this.baseUrl}/${courseId}/enrollments`);
  }

  delete(courseId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${courseId}`);
  }

  updateColor(courseId: string, color: string | null): Observable<CourseResult> {
    return this.http.patch<CourseResult>(`${this.baseUrl}/${courseId}/color`, { color });
  }

  uploadCoverImage(courseId: string, file: File): Observable<CourseResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CourseResult>(`${this.baseUrl}/${courseId}/cover-image`, formData);
  }

  removeCoverImage(courseId: string): Observable<CourseResult> {
    return this.http.delete<CourseResult>(`${this.baseUrl}/${courseId}/cover-image`);
  }

  // Cache-busted con un timestamp para que el <img> se refresque después de subir/quitar
  // portada -- si no, el navegador sigue mostrando la imagen vieja con la misma URL.
  getCoverImageUrl(courseId: string, cacheBust?: number): string {
    const suffix = cacheBust ? `?v=${cacheBust}` : '';
    return `${this.baseUrl}/${courseId}/cover-image${suffix}`;
  }
}
