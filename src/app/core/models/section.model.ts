export type SectionStatus = 'Visible' | 'Oculto';

export interface SectionResult {
  id: string;
  courseId: string;
  title: string;
  descriptionHtml: string;
  // Vacío = global (visible para todo el curso). Si tiene elementos, solo esas
  // fichas pueden verla.
  cohortIds: string[];
  // Oculto: solo la ve el profesor dueño del curso, no dispara notificaciones.
  status: SectionStatus;
}
