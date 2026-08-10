export type EnrollmentMode = 'Abierta' | 'ConAprobacion';
export type CourseStatus = 'Activo' | 'Archivado';

export interface CourseResult {
  id: string;
  name: string;
  enrollmentMode: EnrollmentMode;
  status: CourseStatus;
  // Todo curso tiene código de invitación, sin importar el modo: la invitación
  // siempre pasa por alto el modo de inscripción (auto-servicio o aprobación).
  invitationCode: string;
  profesorId: string;
}
