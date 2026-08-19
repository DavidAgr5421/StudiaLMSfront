import { Component, DestroyRef, ElementRef, HostListener, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval, of, startWith, switchMap, catchError } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationResult } from '../../../core/models/notification.model';

const POLL_INTERVAL_MS = 60_000;

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBell {
  private readonly notificationService = inject(NotificationService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly notifications = signal<NotificationResult[]>([]);
  protected readonly isOpen = signal(false);
  protected readonly unreadCount = computed(() => this.notifications().filter((n) => !n.readAtUtc).length);

  constructor() {
    interval(POLL_INTERVAL_MS)
      .pipe(
        startWith(0),
        switchMap(() => this.notificationService.getMine().pipe(catchError(() => of([])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((notifications) => this.notifications.set(notifications));
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null): void {
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  select(notification: NotificationResult): void {
    if (notification.readAtUtc) return;

    this.notificationService.markAsRead(notification.id).subscribe((updated) => {
      this.notifications.update((current) => current.map((n) => (n.id === updated.id ? updated : n)));
    });
  }
}
