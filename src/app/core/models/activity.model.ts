export type ActivityType = 'ConArchivo' | 'SoloTexto';

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
  // fichas pueden verla.
  cohortIds: string[];
  // Material de apoyo que sube el profesor -- no confundir con las entregas.
  files: ActivityFileResult[];
  // Solo lo trae GET /activities/{id} (la página standalone) -- los listados por
  // sección no lo necesitan porque el caller ya conoce el curso por contexto.
  courseId: string | null;
}
