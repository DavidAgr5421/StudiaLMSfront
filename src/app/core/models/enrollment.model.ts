export type EnrollmentStatus = 'Pendiente' | 'Aprobada' | 'Rechazada';

export interface EnrollmentResult {
  id: string;
  courseId: string;
  studentId: string;
  status: EnrollmentStatus;
  requestedAtUtc: string;
  decidedAtUtc: string | null;
  studentName: string | null;
  studentEmail: string | null;
}

export interface AddStudentToCourseOutcome {
  identifier: string;
  success: boolean;
  errorMessage: string | null;
  enrollment: EnrollmentResult | null;
}

export interface AddStudentsToCourseResult {
  outcomes: AddStudentToCourseOutcome[];
}
