export type ActivityType = 'ConArchivo' | 'SoloTexto';
export type ActivityStatus = 'Visible' | 'Oculto';
// Foro y Evaluación existen en el backend para uso futuro, pero esta fase del front
// solo ofrece crear Individual y Grupal -- ver ACTIVITY_KINDS_CREATABLE.
export type ActivityKind = 'Individual' | 'Grupal' | 'Foro' | 'Evaluacion';

export interface ActivityFileResult {
  fileName: string;
  storageKey: string;
  sizeBytes: number;
}

export interface ActivityResult {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  dueDateUtc: string;
  type: ActivityType;
  maxFiles: number | null;
  // Vacío = global (visible para todo el curso). Si tiene elementos, solo esas
  // fichas pueden verla. Para actividades Grupales, además define los grupos que
  // pueden entregar (cada ficha = un grupo).
  cohortIds: string[];
  // Material de apoyo que sube el profesor -- no confundir con las entregas.
  files: ActivityFileResult[];
  // Solo lo trae GET /activities/{id} (la página standalone) -- los listados por
  // sección no lo necesitan porque el caller ya conoce el curso por contexto.
  courseId: string | null;
  // Oculto: solo la ve el profesor dueño del curso, no dispara notificaciones.
  status: ActivityStatus;
  kind: ActivityKind;
  // Antes de esta fecha la actividad no es visible para estudiantes (como Oculto) --
  // el profesor/admin sí la ve siempre, para poder prepararla con anticipación.
  openDateUtc: string | null;
  allowsLateSubmission: boolean;
  isManuallyClosed: boolean;
  // Resume en un solo booleano fecha límite + tardía + cierre manual, ya calculado
  // por el backend (Activity.AcceptsSubmissionsAt) -- evita reimplementar esa lógica acá.
  acceptsSubmissions: boolean;
  // Refleja Activity.HasOpenedAt(ahora) -- si es false, el profesor/admin la sigue viendo
  // pero los estudiantes todavía no.
  hasOpened: boolean;
}

export const ACTIVITY_KINDS_CREATABLE: ActivityKind[] = ['Individual', 'Grupal'];

export const ACTIVITY_KIND_ICONS: Record<ActivityKind, string> = {
  Individual: '📄',
  Grupal: '👥',
  Foro: '💬',
  Evaluacion: '📝',
};

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  Individual: 'Individual',
  Grupal: 'Grupal',
  Foro: 'Foro',
  Evaluacion: 'Evaluación',
};
