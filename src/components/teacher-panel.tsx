'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTH_NAMES, SESSION_MONTHS, MONTH_SHORT, CLASS_OPTIONS, subjectsMatch, CLASS_4_8_SUBJECTS } from '@/lib/types'
import type { TeacherData, StudentData, SalaryPayment } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Wallet,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Eye,
  Lock,
  User,
  BookOpen,
  GraduationCap,
  Printer,
  IndianRupee,
  Calendar,
  Clock,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'

// Format amount with ₹ symbol and Indian comma system
function formatINR(amount: number): string {
  const isNegative = amount < 0
  const abs = Math.abs(amount)
  const str = abs.toFixed(0)
  const parts = str.split('')
  const result: string[] = []

  for (let i = parts.length - 1, count = 0; i >= 0; i--) {
    result.unshift(parts[i])
    count++
    if (count === 3 && i > 0) {
      result.unshift(',')
      count = 0
    } else if (count > 3 && count % 2 === 1 && i > 0) {
      result.unshift(',')
    }
  }

  return (isNegative ? '-' : '') + '₹' + result.join('')
}

function getSessionYear(): number {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return month >= 1 && month <= 3 ? year - 1 : year
}

// Print salary slip in A4 format
function printSalarySlip(
  teacher: TeacherData,
  slip: SalaryPayment,
  totalYearlyEarning: number,
  totalReceived: number,
  remaining: number,
  sessionYear: number
) {
  const allSubjects = teacher.classSubjects
    ?.flatMap((cs) => cs.subjects)
    .filter((v, i, a) => a.indexOf(v) === i) || []
  const subjectsStr = allSubjects.join(', ') || 'N/A'

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Salary Slip - ${MONTH_NAMES[slip.month]} ${slip.year}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; }
  .slip-container { max-width: 210mm; margin: 0 auto; }
  .header { text-align: center; border-bottom: 3px double #2F2FE4; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { margin: 0; font-size: 22px; color: #2F2FE4; letter-spacing: 1px; }
  .header p { margin: 4px 0 0; font-size: 12px; color: #666; }
  .section { margin-bottom: 16px; }
  .section-title { font-size: 13px; font-weight: 700; color: #2F2FE4; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 13px; }
  .info-grid .label { color: #666; }
  .info-grid .value { font-weight: 600; }
  .payment-box { background: #f0f0ff; border: 1px solid #d0d0ee; border-radius: 8px; padding: 12px; margin: 12px 0; }
  .payment-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
  .payment-row.total { font-size: 18px; font-weight: 700; color: #2F2FE4; border-top: 2px solid #2F2FE4; padding-top: 6px; margin-top: 6px; }
  .payment-row.remaining { font-size: 16px; font-weight: 600; color: #dc2626; }
  .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #888; }
  .footer .signature { text-align: center; }
  .footer .signature .line { border-top: 1px solid #333; width: 160px; margin-bottom: 4px; }
  .footer .signature .title { font-weight: 600; color: #333; font-size: 12px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="slip-container">
  <div class="header">
    <h1>SANKALP VIDYA ACADEMY</h1>
    <p>Salary Payment Receipt | Session ${sessionYear}-${(sessionYear + 1) % 100}</p>
  </div>

  <div class="section">
    <div class="section-title">Teacher Information</div>
    <div class="info-grid">
      <div><span class="label">Teacher Name:</span></div>
      <div class="value">${teacher.name}</div>
      <div><span class="label">Subjects:</span></div>
      <div class="value">${subjectsStr}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Earning Summary</div>
    <div class="info-grid">
      <div><span class="label">Total Yearly Earning:</span></div>
      <div class="value">${formatINR(totalYearlyEarning)}</div>
      <div><span class="label">Received Salary:</span></div>
      <div class="value" style="color:#16a34a">${formatINR(totalReceived)}</div>
      <div><span class="label">Remaining Salary:</span></div>
      <div class="value" style="color:#dc2626">${formatINR(remaining)}</div>
    </div>
  </div>

  <div class="payment-box">
    <div class="section-title" style="border-bottom:none;padding-bottom:0;margin-bottom:8px">Current Payment Details</div>
    <div class="payment-row">
      <span>Month:</span>
      <span class="value">${MONTH_NAMES[slip.month]} ${slip.year}</span>
    </div>
    <div class="payment-row total">
      <span>Salary Amount:</span>
      <span>${formatINR(slip.amount)}</span>
    </div>
    <div class="payment-row">
      <span>Payment Mode:</span>
      <span class="value">${slip.paymentMode}</span>
    </div>
    <div class="payment-row">
      <span>Payment Date:</span>
      <span class="value">${new Date(slip.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
    </div>
  </div>

  <div class="footer">
    <div>
      <div style="font-size:11px;color:#999">Generated on ${new Date().toLocaleDateString('en-IN')}</div>
    </div>
    <div class="signature">
      <div class="line"></div>
      <div class="title">Director Signature</div>
    </div>
  </div>
</div>
</body>
</html>`)
  printWindow.document.close()
  setTimeout(() => {
    printWindow.print()
  }, 300)
}

export default function TeacherPanel() {
  const { user, teacherView, refreshKey } = useAppStore()
  const [teacher, setTeacher] = useState<TeacherData | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<SalaryPayment | null>(null)
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const sessionYear = getSessionYear()

  useEffect(() => {
    if (!user) return
    let active = true

    fetch('/api/teachers')
      .then((tRes) => (tRes.ok ? tRes.json() : null))
      .then((allTeachers: TeacherData[] | null) => {
        if (!active || !allTeachers) return
        const myTeacher = allTeachers.find((t) => t.userId === user!.id)
        setTeacher(myTeacher || null)

        if (myTeacher) {
          // Fetch salary payments
          fetch(`/api/salary?teacherId=${myTeacher.id}`)
            .then((sRes) => (sRes.ok ? sRes.json() : null))
            .then((salaryData) => {
              if (active && salaryData) setSalaryPayments(salaryData)
            })
            .catch(() => {})

          // Fetch students in teacher's classes
          fetch('/api/students')
            .then((allStudentsRes) => (allStudentsRes.ok ? allStudentsRes.json() : null))
            .then((allStudents: StudentData[] | null) => {
              if (!active || !allStudents) return
              const matched = allStudents.filter((s) => {
                // Find teacher's subject mapping for this student's class
                const classMapping = myTeacher.classSubjects?.find(
                  (cs) => cs.className === s.className
                )
                if (!classMapping || classMapping.subjects.length === 0) return false
                // Student must share at least one subject with the teacher in this class
                // Uses backward-compatible matching (legacy "All Subjects" matches any 4-8 subject)
                const studentSubjects = s.subjects || []
                return subjectsMatch(studentSubjects, classMapping.subjects)
              })
              setStudents(matched)
            })
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [user, refreshKey])

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          oldPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password changed successfully')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setChangingPassword(false)
  }

  // Calculate salary summary
  const paidSalaryMonths = salaryPayments.filter(
    (sp) => sp.year === sessionYear || (sp.month >= 1 && sp.month <= 3 && sp.year === sessionYear + 1)
  )
  const totalReceived = paidSalaryMonths.reduce((sum, sp) => sum + sp.amount, 0)

  // Calculate total yearly earning from latest salary payment OR from students
  let totalYearlyEarning = 0
  if (paidSalaryMonths.length > 0) {
    totalYearlyEarning = paidSalaryMonths[paidSalaryMonths.length - 1].totalYearlyEarning
  } else if (teacher) {
    // Calculate from students' subject fees for subjects this teacher teaches
    totalYearlyEarning = students.reduce((sum, s) => {
      const classMapping = teacher.classSubjects?.find(
        (cs) => cs.className === s.className
      )
      if (!classMapping) return sum
      const teacherSubjects = classMapping.subjects
      const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
      const relevantFees = s.subjectFees.filter((sf) => {
        if (teacherSubjects.includes(sf.subject)) return true
        if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
        return false
      })
      const subjectFeeTotal = relevantFees.reduce((s2, sf) => s2 + sf.yearlyFee, 0)
      // Coaching fee is NOT included in teacher earnings per PRD
      return sum + subjectFeeTotal
    }, 0)
  }

  const remaining = Math.max(0, totalYearlyEarning - totalReceived)

  // Calculate monthly salary based on remaining months
  const currentMonth = new Date().getMonth() + 1
  const currentIdx = SESSION_MONTHS.indexOf(currentMonth)
  const remainingMonths = SESSION_MONTHS.length - currentIdx
  const monthlySalary = remainingMonths > 0 ? remaining / remainingMonths : 0

  // Calculate student contribution data for the dashboard
  const studentContributions = students.map((s) => {
    const classMapping = teacher?.classSubjects?.find(
      (cs) => cs.className === s.className
    )
    if (!classMapping) return null
    const teacherSubjects = classMapping.subjects
    const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
    const matchedSubjects = teacherSubjects.filter((t) => s.subjects.includes(t) || (t === 'All Subjects' && s.subjects.some((sub) => CLASS_4_8_SUBJECTS.includes(sub))))
    const relevantFees = s.subjectFees.filter((sf) => {
      if (teacherSubjects.includes(sf.subject)) return true
      if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
      return false
    })
    const subjectFeeTotal = relevantFees.reduce((sum, sf) => sum + sf.yearlyFee, 0)
    // Coaching fee is NOT included in teacher earnings per PRD
    const totalContribution = subjectFeeTotal
    return {
      id: s.id,
      name: s.name,
      className: s.className,
      subjectFees: relevantFees.map((sf) => ({ subject: sf.subject, yearlyFee: sf.yearlyFee })),
      totalContribution,
    }
  }).filter(Boolean) as Array<{
    id: string
    name: string
    className: string
    subjectFees: Array<{ subject: string; yearlyFee: number }>
    totalContribution: number
  }>

  // Progress percentage for salary received
  const salaryProgressPercent = totalYearlyEarning > 0
    ? Math.round((totalReceived / totalYearlyEarning) * 100)
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!teacher) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8" />
          <p>Teacher profile not found. Please contact admin.</p>
        </CardContent>
      </Card>
    )
  }

  // ============ Dashboard View ============
  if (teacherView === 'dashboard') {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Teacher Dashboard</h2>
        </div>

        {/* Salary Overview - 4 Card Layout */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Yearly Earning */}
          <Card className="border-l-4 border-l-brand">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-brand">
                <Wallet className="h-4 w-4" />
                Total Yearly Earning
              </CardDescription>
              <CardTitle className="text-2xl">{formatINR(totalYearlyEarning)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Session {sessionYear}-{(sessionYear + 1) % 100}
              </p>
            </CardContent>
          </Card>

          {/* Received Amount */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Received Amount
              </CardDescription>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                {formatINR(totalReceived)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Salary Paid • {paidSalaryMonths.length} month(s) paid
              </p>
            </CardContent>
          </Card>

          {/* Remaining Amount */}
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                <AlertCircle className="h-4 w-4" />
                Remaining Amount
              </CardDescription>
              <CardTitle className="text-2xl text-orange-600 dark:text-orange-400">
                {formatINR(remaining)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {SESSION_MONTHS.length - paidSalaryMonths.length} month(s) pending
              </p>
            </CardContent>
          </Card>

          {/* Monthly Salary */}
          <Card className="border-l-4 border-l-brand bg-brand/5 dark:bg-brand/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-brand">
                <IndianRupee className="h-4 w-4" />
                Monthly Salary
              </CardDescription>
              <CardTitle className="text-2xl text-brand">
                {formatINR(Math.round(monthlySalary))}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {remainingMonths} month(s) remaining
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Salary Progress Bar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Salary Collection Progress
              </CardTitle>
              <span className="text-sm font-semibold text-brand">
                {salaryProgressPercent}%
              </span>
            </div>
            <CardDescription>
              {formatINR(totalReceived)} received out of {formatINR(totalYearlyEarning)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={salaryProgressPercent} className="h-3" />
          </CardContent>
        </Card>

        {/* View Monthly Salary Button */}
        <Button
          className="w-full gap-2 bg-brand hover:bg-brand/90"
          onClick={() => setSalaryModalOpen(true)}
        >
          <Calendar className="h-4 w-4" />
          View Monthly Salary
        </Button>

        {/* Monthly Salary Status Modal */}
        <Dialog open={salaryModalOpen} onOpenChange={setSalaryModalOpen}>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand" />
                Monthly Salary Status
              </DialogTitle>
              <DialogDescription>
                April {sessionYear} - March {sessionYear + 1}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {SESSION_MONTHS.map((m) => {
                const year = m >= 4 ? sessionYear : sessionYear + 1
                const payment = salaryPayments.find(
                  (sp) => sp.month === m && sp.year === year
                )
                const isPaid = !!payment
                const isCurrentMonth = m === currentMonth

                return (
                  <div
                    key={m}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                      isCurrentMonth
                        ? 'border-brand/50 bg-brand/5 dark:bg-brand/10'
                        : isPaid
                        ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isPaid
                            ? 'bg-green-500'
                            : isCurrentMonth
                            ? 'bg-brand animate-pulse'
                            : 'bg-orange-400'
                        }`}
                      />
                      <span className={`font-medium text-sm ${isCurrentMonth ? 'text-brand' : ''}`}>
                        {MONTH_NAMES[m]} {year}
                        {isCurrentMonth && (
                          <span className="ml-1.5 text-xs font-normal text-brand/70">(Current)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm tabular-nums ${
                        isPaid
                          ? 'text-green-700 dark:text-green-400 font-medium'
                          : 'text-muted-foreground'
                      }`}>
                        {isPaid ? formatINR(payment.amount) : formatINR(Math.round(monthlySalary))}
                      </span>
                      <Badge
                        variant={isPaid ? 'default' : 'outline'}
                        className={
                          isPaid
                            ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                            : isCurrentMonth
                            ? 'bg-brand/10 text-brand border-brand/30'
                            : 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                        }
                      >
                        {isPaid ? 'Paid' : isCurrentMonth ? 'Current' : 'Expected'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Salary Slip Option in Modal */}
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  setSalaryModalOpen(false)
                  // Navigate to salary view if available
                  const { setTeacherView } = useAppStore.getState()
                  setTeacherView('salary')
                }}
              >
                <Receipt className="h-4 w-4" />
                View Full Salary History
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Student Contribution Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              Student Contribution
            </CardTitle>
            <CardDescription>
              Students contributing to your earnings ({studentContributions.length} student{studentContributions.length !== 1 ? 's' : ''})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentContributions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No students found in your assigned classes.
              </p>
            ) : (
              <ScrollArea className="max-h-96">
                <div className="space-y-3">
                  {studentContributions.map((sc) => (
                    <div
                      key={sc.id}
                      className="rounded-lg border px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-brand/60" />
                          <span className="font-medium text-sm">{sc.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Class {sc.className}
                          </Badge>
                          <span className="text-sm font-semibold text-brand tabular-nums">
                            {formatINR(sc.totalContribution)}
                          </span>
                        </div>
                      </div>
                      {/* Subject-wise fees */}
                      {sc.subjectFees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {sc.subjectFees.map((sf) => (
                            <span
                              key={sf.subject}
                              className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
                            >
                              <BookOpen className="h-3 w-3" />
                              {sf.subject}: {formatINR(sf.yearlyFee)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============ Salary View ============
  if (teacherView === 'salary') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Salary History</h2>
        </div>

        {/* Salary Slip Dialog */}
        <Dialog open={slipDialogOpen} onOpenChange={setSlipDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
              <DialogDescription>Payment receipt details</DialogDescription>
            </DialogHeader>
            {selectedSlip && (
              <div className="space-y-4">
                {/* A4-Styled Salary Slip Preview */}
                <div className="rounded-lg border p-4 space-y-3">
                  {/* Header */}
                  <div className="text-center border-b-2 border-double border-brand pb-3">
                    <h3 className="font-bold text-lg text-brand tracking-wide">SANKALP VIDYA ACADEMY</h3>
                    <p className="text-xs text-muted-foreground">Salary Payment Receipt | Session {sessionYear}-{(sessionYear + 1) % 100}</p>
                  </div>

                  {/* Teacher Information */}
                  <div>
                    <p className="text-xs font-bold text-brand uppercase tracking-wide border-b pb-1 mb-2">Teacher Information</p>
                    <div className="grid grid-cols-2 gap-1.5 text-sm">
                      <span className="text-muted-foreground">Teacher Name:</span>
                      <span className="font-medium">{teacher.name}</span>
                      <span className="text-muted-foreground">Subjects:</span>
                      <span className="font-medium text-xs">
                        {teacher.classSubjects?.flatMap((cs) => cs.subjects).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Earning Summary */}
                  <div>
                    <p className="text-xs font-bold text-brand uppercase tracking-wide border-b pb-1 mb-2">Earning Summary</p>
                    <div className="grid grid-cols-2 gap-1.5 text-sm">
                      <span className="text-muted-foreground">Total Yearly Earning:</span>
                      <span className="font-medium">{formatINR(totalYearlyEarning)}</span>
                      <span className="text-muted-foreground">Received Salary:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">{formatINR(totalReceived)}</span>
                      <span className="text-muted-foreground">Remaining Salary:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{formatINR(remaining)}</span>
                    </div>
                  </div>

                  {/* Payment Details Box */}
                  <div className="bg-brand/5 border border-brand/20 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-bold text-brand uppercase tracking-wide">Current Payment</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Month:</span>
                      <span className="font-medium">{MONTH_NAMES[selectedSlip.month]} {selectedSlip.year}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-brand border-t border-brand/30 pt-1.5">
                      <span>Salary Amount:</span>
                      <span>{formatINR(selectedSlip.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Mode:</span>
                      <span className="font-medium">{selectedSlip.paymentMode}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Payment Date:</span>
                      <span className="font-medium">
                        {new Date(selectedSlip.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-end pt-4 text-xs text-muted-foreground">
                    <span>Generated on {new Date().toLocaleDateString('en-IN')}</span>
                    <div className="text-center">
                      <div className="border-t border-foreground/30 w-40 mb-1" />
                      <span className="font-semibold text-foreground text-xs">Director Signature</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      printSalarySlip(
                        teacher,
                        selectedSlip,
                        totalYearlyEarning,
                        totalReceived,
                        remaining,
                        sessionYear
                      )
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Print Salary Slip
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      const slipText = [
                        'Sankalp Vidya Academy - Salary Slip',
                        '─────────────────────────',
                        `Teacher: ${teacher.name}`,
                        `Month: ${MONTH_NAMES[selectedSlip.month]} ${selectedSlip.year}`,
                        `Amount: ${formatINR(selectedSlip.amount)}`,
                        `Payment Mode: ${selectedSlip.paymentMode}`,
                        `Date: ${new Date(selectedSlip.paidAt).toLocaleDateString('en-IN')}`,
                      ].join('\n')
                      const blob = new Blob([slipText], { type: 'text/plain' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `salary-slip-${MONTH_SHORT[selectedSlip.month]}-${selectedSlip.year}.txt`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download Slip
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {salaryPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No salary payments recorded yet.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryPayments.map((sp) => (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">
                          {MONTH_NAMES[sp.month]} {sp.year}
                        </TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400">
                          {formatINR(sp.amount)}
                        </TableCell>
                        <TableCell>{sp.paymentMode}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(sp.paidAt).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSlip(sp)
                                setSlipDialogOpen(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                printSalarySlip(
                                  teacher,
                                  sp,
                                  totalYearlyEarning,
                                  totalReceived,
                                  remaining,
                                  sessionYear
                                )
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const slipText = [
                                  'Sankalp Vidya Academy - Salary Slip',
                                  '─────────────────────────',
                                  `Teacher: ${teacher.name}`,
                                  `Month: ${MONTH_NAMES[sp.month]} ${sp.year}`,
                                  `Amount: ${formatINR(sp.amount)}`,
                                  `Payment Mode: ${sp.paymentMode}`,
                                  `Date: ${new Date(sp.paidAt).toLocaleDateString('en-IN')}`,
                                ].join('\n')
                                const blob = new Blob([slipText], { type: 'text/plain' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `salary-slip-${MONTH_SHORT[sp.month]}-${sp.year}.txt`
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============ Students View ============
  if (teacherView === 'students') {
    // Group students by class
    const groupedByClass: Record<string, StudentData[]> = {}
    students.forEach((s) => {
      if (!groupedByClass[s.className]) groupedByClass[s.className] = []
      groupedByClass[s.className].push(s)
    })

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">My Students</h2>
        </div>

        {Object.keys(groupedByClass).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No students found in your assigned classes.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedByClass).map(([className, classStudents]) => (
            <Card key={className}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Class {className}
                  <Badge variant="secondary" className="text-xs">
                    {classStudents.length} student(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classStudents.map((student) => {
                    // Get teacher's subjects for this student's class
                    const classMapping = teacher.classSubjects?.find(
                      (cs) => cs.className === student.className
                    )
                    const teacherSubjects = classMapping?.subjects || []
                    const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
                    const relevantFees = student.subjectFees.filter((sf) => {
                      if (teacherSubjects.includes(sf.subject)) return true
                      if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
                      return false
                    })

                    return (
                      <div
                        key={student.id}
                        className="rounded-lg border px-4 py-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{student.name}</span>
                          <Badge variant="outline" className="text-xs">
                            Class {student.className}
                          </Badge>
                        </div>
                        {/* Subject-wise fees (only teacher's subjects) */}
                        {relevantFees.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {relevantFees.map((sf) => (
                              <span
                                key={sf.id}
                                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                <BookOpen className="h-3 w-3" />
                                {sf.subject}: {formatINR(sf.yearlyFee)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    )
  }

  // ============ Profile View ============
  if (teacherView === 'profile') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Profile</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Teacher Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Teacher Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{teacher.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Username</span>
                  <span className="font-medium">{user?.username}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="secondary">{user?.role}</Badge>
                </div>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Class-Subject Mapping</span>
                  <div className="mt-2 space-y-2">
                    {(teacher.classSubjects && teacher.classSubjects.length > 0) ? (
                      teacher.classSubjects.map((cs, idx) => (
                        <div key={idx} className="rounded-lg border p-2.5 bg-muted/30">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <GraduationCap className="h-3.5 w-3.5 text-brand" />
                            <Badge variant="outline" className="text-xs font-medium">
                              Class {cs.className}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5">
                            {cs.subjects.map((sub) => (
                              <Badge key={sub} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No class-subject mapping available</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-1.5">
                <Lock className="h-4 w-4" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old-pw">Old Password</Label>
                <Input
                  id="old-pw"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm New Password</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
