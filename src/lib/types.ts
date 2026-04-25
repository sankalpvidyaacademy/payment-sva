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

// Class definitions with subjects mapping
export const CLASS_OPTIONS = [
  '4', '5', '6', '7', '8',
  '9 CBSE', '10 CBSE',
  '9 ICSE', '10 ICSE',
  '11 Science', '12 Science',
  '11 Commerce', '12 Commerce',
]

export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  '4': ['All Subjects'],
  '5': ['All Subjects'],
  '6': ['All Subjects'],
  '7': ['All Subjects'],
  '8': ['All Subjects'],
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
