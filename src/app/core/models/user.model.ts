export type Role = 'Administrador' | 'Profesor' | 'Estudiante';

export interface UserResult {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}
