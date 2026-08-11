import { Role } from './user.model';

export interface LoginResult {
  userId: string;
  email: string;
  role: Role;
  token: string;
  expiresAtUtc: string;
}
