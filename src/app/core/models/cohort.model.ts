export interface CohortResult {
  id: string;
  courseId: string;
  name: string;
  studentIds: string[];
}

export interface AssignStudentToCohortOutcome {
  identifier: string;
  success: boolean;
  errorMessage: string | null;
}

export interface AssignStudentsToCohortResult {
  cohort: CohortResult;
  outcomes: AssignStudentToCohortOutcome[];
}
