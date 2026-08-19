export type SubmissionStatus = 'ATiempo' | 'Tardia';

export interface SubmittedFileResult {
  fileName: string;
  storageKey: string;
  sizeBytes: number;
}

export interface SubmissionResult {
  id: string;
  activityId: string;
  studentId: string;
  // Solo en actividades Grupales -- la ficha dueña de la entrega. Cualquier
  // integrante ve/edita la misma entrega, no solo quien la subió.
  groupId: string | null;
  status: SubmissionStatus;
  submittedAtUtc: string;
  updatedAtUtc: string | null;
  textContent: string | null;
  files: SubmittedFileResult[];
  score: number | null;
  feedback: string | null;
  studentName: string | null;
  groupName: string | null;
}
