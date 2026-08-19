import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { ThemeService } from '../../../core/services/theme.service';
import { Sidebar } from '../sidebar/sidebar';
import { CourseSearch } from '../course-search/course-search';
import { NotificationBell } from '../notification-bell/notification-bell';
import { ConfirmDialog } from '../../ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Sidebar, CourseSearch, NotificationBell, ConfirmDialog],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly currentUser = inject(CurrentUserService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isMobileSidebarOpen.set(false);
    });
  }

  protected readonly isSidebarOpen = signal(true);
  protected readonly isMobileSidebarOpen = signal(false);
  protected readonly showLogoutConfirm = signal(false);
  protected readonly isLoggingOut = signal(false);

  protected readonly displayName = () =>
    this.currentUser.user()?.name || this.currentUser.user()?.email || this.auth.currentUser()?.email || '';

  protected readonly initials = () => {
    const name = this.displayName();
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase() || '?';
  };

  protected readonly homeLink = () => (this.auth.role() === 'Estudiante' ? '/estudiante' : '/profesor');

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
  }

  toggleMobileSidebar(): void {
    this.isMobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen.set(false);
  }

  requestLogout(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  async confirmLogout(): Promise<void> {
    this.isLoggingOut.set(true);
    await this.auth.logout();
    this.isLoggingOut.set(false);
    this.showLogoutConfirm.set(false);
    this.router.navigateByUrl('/login');
  }
}
