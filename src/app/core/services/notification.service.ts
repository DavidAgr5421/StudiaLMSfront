import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationResult } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  getMine(): Observable<NotificationResult[]> {
    return this.http.get<NotificationResult[]>(`${this.baseUrl}/me`);
  }

  markAsRead(notificationId: string): Observable<NotificationResult> {
    return this.http.post<NotificationResult>(`${this.baseUrl}/${notificationId}/read`, {});
  }

  notifyNewActivity(activityId: string) {
    return this.http.post(`${this.baseUrl}/new-activity/${activityId}`, {});
  }

  notifyNewSection(sectionId: string) {
    return this.http.post(`${this.baseUrl}/new-section/${sectionId}`, {});
  }

  sendDueDateReminder(activityId: string) {
    return this.http.post(`${this.baseUrl}/due-date-reminder/${activityId}`, {});
  }
}
