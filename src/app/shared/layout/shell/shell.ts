import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CurrentUserService } from '../../../core/services/current-user.service';
import { Sidebar } from '../sidebar/sidebar';
import { CourseSearch } from '../course-search/course-search';
import { ConfirmDialog } from '../../ui/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, Sidebar, CourseSearch, ConfirmDialog],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  protected readonly isSidebarOpen = signal(true);
  protected readonly showLogoutConfirm = signal(false);
  protected readonly isLoggingOut = signal(false);

  protected readonly displayName = () =>
    this.currentUser.user()?.name || this.currentUser.user()?.email || this.auth.currentUser()?.email || '';

  protected readonly homeLink = () => (this.auth.role() === 'Estudiante' ? '/estudiante' : '/profesor');

  toggleSidebar(): void {
    this.isSidebarOpen.update((open) => !open);
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
