import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IdentificationType, UserResult } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  search(query: string): Observable<UserResult[]> {
    return this.http.get<UserResult[]>(`${this.baseUrl}/search`, { params: { q: query } });
  }

  getMe(): Observable<UserResult> {
    return this.http.get<UserResult>(`${this.baseUrl}/me`);
  }

  getById(userId: string): Observable<UserResult> {
    return this.http.get<UserResult>(`${this.baseUrl}/${userId}`);
  }

  setIdentification(typeId: IdentificationType, valueId: string): Observable<UserResult> {
    return this.http.patch<UserResult>(`${this.baseUrl}/me/identification`, { typeId, valueId });
  }

  updateName(name: string | null): Observable<UserResult> {
    return this.http.patch<UserResult>(`${this.baseUrl}/me/name`, { name });
  }

  changeEmail(newEmail: string, currentPassword: string): Observable<UserResult> {
    return this.http.post<UserResult>(`${this.baseUrl}/me/email`, { newEmail, currentPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/me/password`, { currentPassword, newPassword });
  }
}
