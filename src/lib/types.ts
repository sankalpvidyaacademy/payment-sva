export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  name: string
}

export interface SubjectFee {
  id: string
  studentId: string
  subject: string
  yearlyFee: number
}

export interface FeePayment {
  id: string
  studentId: string
  month: number
  year: number
  amountDue: number
  amountPaid: number
  paymentMode: string
  slipNumber: string | null
  paidAt: string | null
  createdAt: string
}

export interface MonthlyFeeDistribution {
  id: string
  studentId: string
  month: number
  year: number
  amount: number
}

export interface StudentData {
  id: string
  userId: string
  name: string
  dob: string | null
  className: string
  subjects: string[]
  totalYearlyFee: number
  coachingFee: number
  monthlyFee: number
  createdAt: string
  updatedAt: string
  subjectFees: SubjectFee[]
  feePayments: FeePayment[]
  monthlyFeeDistributions: MonthlyFeeDistribution[]
  user: { id: string; username: string; role: string; name: string }
}

export interface SalaryPayment {
  id: string
  teacherId: string
  month: number
  year: number
  totalYearlyEarning: number
  totalReceivedFees: number
  amount: number
  paymentMode: string
  paidAt: string
  createdAt: string
}

export interface TeacherData {
  id: string
  userId: string
  name: string
  classes: string[]
  subjects: string[]
  classSubjects: Array<{ className: string; subjects: string[] }>
  createdAt: string
  updatedAt: string
  salaryPayments: SalaryPayment[]
  user: { id: string; username: string; role: string; name: string }
}

export interface ExpenseData {
  id: string
  month: number
  year: number
  amount: number
  purpose: string
  createdAt: string
}

export interface MonthlyReport {
  type: 'monthly'
  month: number
  year: number
  totalFeesReceived: number
  totalSubjectFees: number
  totalCoachingFees: number
  totalExpenses: number
  totalSalaryPaid: number
  profitLoss: number
  feePaymentCount: number
  expenseCount: number
  salaryPaymentCount: number
}

export interface YearlyReport {
  type: 'yearly'
  sessionYear: number
  sessionLabel: string
  totalFeesReceived: number
  totalSubjectFees: number
  totalCoachingFees: number
  totalExpenses: number
  totalSalaryPaid: number
  profitLoss: number
  monthlyBreakdown: Array<{
    month: number
    year: number
    monthName: string
    fees: number
    subjectFees: number
    coachingFees: number
    expenses: number
    salary: number
    profitLoss: number
  }>
}

export interface PendingFeesReport {
  type: 'pending-fees'
  sessionYear: number
  sessionLabel: string
  sessionMonths: Array<{ month: number; year: number; monthName: string }>
  students: Array<{
    id: string
    name: string
    className: string
    subjects: string[]
    monthlyFee: number
    totalYearlyFee: number
    monthlyData: Record<string, {
      month: number
      year: number
      amountDue: number
      amountPaid: number
      status: string
      colorCode: string
      paidAt: string | null
    }>
  }>
}

export type AdminView = 
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'fees'
  | 'salary'
  | 'expenses'
  | 'reports'
  | 'pending-fees'
  | 'profile'

export type TeacherView =
  | 'dashboard'
  | 'salary'
  | 'students'
  | 'profile'

export type StudentView =
  | 'dashboard'
  | 'fees'
  | 'profile'

// Classes where all subjects are auto-selected (4-8)
export const AUTO_SELECT_ALL_CLASSES = ['4', '5', '6', '7', '8']

// Class definitions with subjects mapping
export const CLASS_OPTIONS = [
  '4', '5', '6', '7', '8',
  '9 CBSE', '10 CBSE',
  '9 ICSE', '10 ICSE',
  '11 Science', '12 Science',
  '11 Commerce', '12 Commerce',
]

// The 4 specific subjects for classes 4-8
export const CLASS_4_8_SUBJECTS = ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject']

/**
 * Backward-compatible subject matching.
 * "All Subjects" (legacy) matches with any of the 4-8 specific subjects.
 * Used for teacher-student matching in salary & dashboard.
 */
export function subjectsMatch(studentSubjects: string[], teacherSubjects: string[]): boolean {
  // Direct match
  if (studentSubjects.some((sub) => teacherSubjects.includes(sub))) return true
  // Legacy "All Subjects" matches with any 4-8 subject
  if (studentSubjects.includes('All Subjects') && teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))) return true
  if (teacherSubjects.includes('All Subjects') && studentSubjects.some((s) => CLASS_4_8_SUBJECTS.includes(s))) return true
  return false
}

/**
 * Normalize subjects: replace legacy "All Subjects" with the 4 specific subjects.
 * Used when loading student data for editing.
 */
export function normalizeSubjects(className: string, subjects: string[]): string[] {
  if (AUTO_SELECT_ALL_CLASSES.includes(className) && subjects.includes('All Subjects')) {
    return [...CLASS_4_8_SUBJECTS]
  }
  return subjects
}

export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  '4': ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'],
  '5': ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'],
  '6': ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'],
  '7': ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'],
  '8': ['A-4-8 Subject', 'H-4-8 Subject', 'R-4-8 Subject', 'S-4-8 Subject'],
  '9 CBSE': ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'],
  '10 CBSE': ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'],
  '9 ICSE': ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'],
  '10 ICSE': ['Math', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'],
  '11 Science': ['Math', 'Physics', 'Chemistry', 'Biology'],
  '12 Science': ['Math', 'Physics', 'Chemistry', 'Biology'],
  '11 Commerce': ['Accounts', 'Business Studies', 'Economics', 'English', 'Applied Math'],
  '12 Commerce': ['Accounts', 'Business Studies', 'Economics', 'English', 'Applied Math'],
}

export const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const SESSION_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]

export const MONTH_SHORT = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
