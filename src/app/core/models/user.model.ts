export type Role = 'Administrador' | 'Profesor' | 'Estudiante';

export type IdentificationType = 'CC' | 'TarjetaIdentidad' | 'Pasaporte';

export interface UserResult {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  typeId: IdentificationType | null;
  valueId: string | null;
}
