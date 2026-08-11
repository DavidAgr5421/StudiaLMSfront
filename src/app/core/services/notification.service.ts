import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

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
