import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResult } from '../models/auth.model';
import { Role } from '../models/user.model';

interface StoredSession {
  userId: string;
  email: string;
  role: Role;
  token: string;
  expiresAtUtc: string;
}

const STORAGE_KEY = 'studia.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly session = signal<StoredSession | null>(this.readStoredSession());

  readonly isLoggedIn = computed(() => this.session() !== null);
  readonly currentUser = computed(() => this.session());
  readonly role = computed(() => this.session()?.role ?? null);
  readonly token = computed(() => this.session()?.token ?? null);

  constructor(private readonly http: HttpClient) {}

  async login(email: string, password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<LoginResult>(`${environment.apiUrl}/auth/login`, { email, password }),
    );
    this.setSession(result);
  }

  async registerEstudiante(email: string, password: string, name: string | null): Promise<void> {
    await firstValueFrom(
      this.http.post(`${environment.apiUrl}/auth/register`, { email, password, name }),
    );
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {}));
    } catch {
      // Best-effort: si el token ya venció o el server no responde, igual cerramos
      // la sesión localmente -- no tiene sentido bloquear al usuario acá.
    } finally {
      this.clearSession();
    }
  }

  private setSession(result: LoginResult): void {
    const stored: StoredSession = {
      userId: result.userId,
      email: result.email,
      role: result.role,
      token: result.token,
      expiresAtUtc: result.expiresAtUtc,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    this.session.set(stored);
  }

  private clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.session.set(null);
  }

  private readStoredSession(): StoredSession | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (new Date(parsed.expiresAtUtc).getTime() <= Date.now()) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
