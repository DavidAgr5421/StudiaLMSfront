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
  status: SubmissionStatus;
  submittedAtUtc: string;
  textContent: string | null;
  files: SubmittedFileResult[];
  score: number | null;
  feedback: string | null;
  studentName: string | null;
}
