export interface SectionResult {
  id: string;
  courseId: string;
  title: string;
  descriptionHtml: string;
  // Vacío = global (visible para todo el curso). Si tiene elementos, solo esas
  // fichas pueden verla.
  cohortIds: string[];
}
