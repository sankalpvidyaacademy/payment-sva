'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Users,
  CreditCard,
  Loader2,
  CheckCircle2,
  IndianRupee,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Receipt,
  Printer,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  MONTH_NAMES,
  MONTH_SHORT,
  SESSION_MONTHS,
  subjectsMatch,
  CLASS_4_8_SUBJECTS,
} from '@/lib/types'
import type { TeacherData, StudentData, SalaryPayment, FeePayment } from '@/lib/types'

// Indian number formatting
function formatINR(amount: number): string {
  const str = Math.round(amount).toString()
  let result = ''
  let count = 0
  for (let i = str.length - 1; i >= 0; i--) {
    result = str[i] + result
    count++
    if (count === 3 && i > 0) {
      result = ',' + result
    } else if (count > 3 && (count - 3) % 2 === 0 && i > 0) {
      result = ',' + result
    }
  }
  return '₹' + result
}

function getSessionYear(): number {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return month >= 4 ? year : year - 1
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

function getRemainingMonthsInSession(): number {
  const cm = getCurrentMonth()
  const currentIdx = SESSION_MONTHS.indexOf(cm)
  return SESSION_MONTHS.length - currentIdx
}

interface TeacherCalc {
  teacher: TeacherData
  matchedStudents: StudentData[]
  totalYearlyEarning: number
  totalReceivedFees: number
  salaryPaidThisSession: number
  currentMonthSalary: number
  salaryHistory: SalaryPayment[]
}

export function SalaryManagement() {
  const [teachers, setTeachers] = useState<TeacherData[]>([])
  const [allStudents, setAllStudents] = useState<StudentData[]>([])
  const [allFees, setAllFees] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  // Pay salary state
  const [paymentMode, setPaymentMode] = useState<string>('Offline')
  const [paying, setPaying] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [lastSalaryPayment, setLastSalaryPayment] = useState<SalaryPayment | null>(null)

  // View past slip state
  const [viewSlipOpen, setViewSlipOpen] = useState(false)
  const [viewSlipPayment, setViewSlipPayment] = useState<SalaryPayment | null>(null)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [teachersRes, studentsRes, feesRes] = await Promise.all([
        fetch('/api/teachers'),
        fetch('/api/students'),
        fetch('/api/fees'),
      ])
      if (!teachersRes.ok || !studentsRes.ok || !feesRes.ok) {
        throw new Error('Failed to fetch data')
      }
      const [teachersData, studentsData, feesData] = await Promise.all([
        teachersRes.json(),
        studentsRes.json(),
        feesRes.json(),
      ])
      setTeachers(teachersData)
      setAllStudents(studentsData)
      setAllFees(feesData)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Calculate teacher details
  const teacherCalcs = useMemo<TeacherCalc[]>(() => {
    const sessionYear = getSessionYear()
    return teachers.map((teacher) => {
      // Match students whose className is in teacher's classes AND subjects overlap using classSubjects
      const matchedStudents = allStudents.filter((s) => {
        // Find teacher's subject mapping for this student's class
        const classMapping = teacher.classSubjects?.find(
          (cs) => cs.className === s.className
        )
        if (!classMapping || classMapping.subjects.length === 0) return false
        // Student must share at least one subject with the teacher in this class
        // Uses backward-compatible matching (legacy "All Subjects" matches any 4-8 subject)
        const studentSubjects = s.subjects || []
        return subjectsMatch(studentSubjects, classMapping.subjects)
      })

      // Total Yearly Earning = sum of ONLY the fees for subjects the teacher teaches
      const totalYearlyEarning = matchedStudents.reduce((sum, s) => {
        // Get teacher's subjects for this student's class
        const classMapping = teacher.classSubjects?.find(
          (cs) => cs.className === s.className
        )
        if (!classMapping) return sum

        // Only count subject fees for subjects the teacher teaches
        // Backward compat: "All Subjects" fee matches if teacher teaches any 4-8 subject
        const teacherSubjects = classMapping.subjects
        const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
        const relevantSubjectFees = s.subjectFees.filter((sf) => {
          if (teacherSubjects.includes(sf.subject)) return true
          if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
          return false
        })
        const subjectFeeTotal = relevantSubjectFees.reduce((s2, sf) => s2 + sf.yearlyFee, 0)

        // Coaching fee is NOT included in teacher earnings per PRD
        // Only subject fees for subjects the teacher teaches are counted
        return sum + subjectFeeTotal
      }, 0)

      // "Received Amount" = Total Salary Paid to Teacher (NOT student fee collected)
      const salaryHistory = teacher.salaryPayments || []
      const salaryPaidThisSession = salaryHistory
        .filter((sp) => {
          if (sp.month >= 4) return sp.year === sessionYear
          return sp.year === sessionYear + 1
        })
        .reduce((sum, sp) => sum + sp.amount, 0)

      // totalReceivedFees = salaryPaidThisSession (for backward compat in UI)
      const totalReceivedFees = salaryPaidThisSession

      // Monthly Salary = Remaining Amount ÷ Remaining Months
      const remainingMonths = getRemainingMonthsInSession()
      const remainingAmount = Math.max(0, totalYearlyEarning - salaryPaidThisSession)
      const currentMonthSalary =
        remainingMonths > 0 ? remainingAmount / remainingMonths : 0

      return {
        teacher,
        matchedStudents,
        totalYearlyEarning,
        totalReceivedFees,
        salaryPaidThisSession,
        currentMonthSalary,
        salaryHistory,
      }
    })
  }, [teachers, allStudents, allFees])

  const selectedCalc = teacherCalcs.find(
    (tc) => tc.teacher.id === selectedTeacherId
  )

  function handleSelectTeacher(teacherId: string) {
    setSelectedTeacherId(teacherId)
    setShowPanel(true)
    setPaymentMode('Offline')
  }

  async function handlePaySalary() {
    setConfirmOpen(true)
  }

  function printSalarySlip() {
    const slipEl = document.getElementById('salary-slip-printable')
    if (!slipEl) return
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${selectedCalc?.teacher.name || 'Teacher'}</title>
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
        ${slipEl.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 300)
  }

  function handleViewSlip(sp: SalaryPayment) {
    setViewSlipPayment(sp)
    setViewSlipOpen(true)
  }

  function printViewSalarySlip() {
    const slipEl = document.getElementById('salary-slip-view-printable')
    if (!slipEl) return
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${selectedCalc?.teacher.name || 'Teacher'}</title>
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
        ${slipEl.innerHTML}
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 300)
  }

  async function confirmPaySalary() {
    if (!selectedCalc) return
    setPaying(true)
    try {
      const cm = getCurrentMonth()
      const cy = getCurrentYear()
      const res = await fetch('/api/salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedCalc.teacher.id,
          month: cm,
          year: cy,
          totalYearlyEarning: selectedCalc.totalYearlyEarning,
          totalReceivedFees: selectedCalc.salaryPaidThisSession,
          amount: Math.round(selectedCalc.currentMonthSalary),
          paymentMode,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Salary payment failed')
      }
      const payment = await res.json()
      setLastSalaryPayment(payment)
      toast.success('Salary paid successfully!')
      setConfirmOpen(false)
      setSuccessOpen(true)
      fetchAllData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Salary payment failed')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Salary Management</h2>
        <p className="text-muted-foreground">
          Calculate and pay teacher salaries based on collected fees
        </p>
      </div>

      {!showPanel ? (
        /* Teacher List */
        <>
          {teachers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No teachers found. Add teachers first.
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Classes</TableHead>
                          <TableHead>Subjects</TableHead>
                          <TableHead>Students</TableHead>
                          <TableHead>Monthly Salary</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teacherCalcs.map((tc) => (
                          <TableRow
                            key={tc.teacher.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSelectTeacher(tc.teacher.id)}
                          >
                            <TableCell className="font-medium">
                              {tc.teacher.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {tc.teacher.classes.map((c) => (
                                  <Badge key={c} variant="outline" className="text-xs">
                                    {c}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {tc.teacher.subjects.map((s) => (
                                  <Badge key={s} variant="secondary" className="text-xs">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{tc.matchedStudents.length}</TableCell>
                            <TableCell className="font-semibold">
                              {formatINR(Math.round(tc.currentMonthSalary))}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="bg-[#2F2FE4] hover:bg-[#2525c0]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectTeacher(tc.teacher.id)
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay Salary
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Mobile Cards */}
              <div className="grid gap-4 md:hidden">
                {teacherCalcs.map((tc) => (
                  <Card
                    key={tc.teacher.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleSelectTeacher(tc.teacher.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg">{tc.teacher.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tc.matchedStudents.length} student
                            {tc.matchedStudents.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-[#2F2FE4] hover:bg-[#2525c0]"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectTeacher(tc.teacher.id)
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pay
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tc.teacher.classes.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {tc.teacher.subjects.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">
                          Monthly Salary:
                        </span>
                        <span className="font-bold text-[#2F2FE4]">
                          {formatINR(Math.round(tc.currentMonthSalary))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      ) : selectedCalc ? (
        /* Salary Panel for Selected Teacher */
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => {
              setShowPanel(false)
              setSelectedTeacherId(null)
            }}
            className="mb-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Teachers
          </Button>

          {/* Teacher Info Card */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[#2F2FE4]/10 flex items-center justify-center">
                  <Users className="h-7 w-7 text-[#2F2FE4]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedCalc.teacher.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      {selectedCalc.teacher.classes.join(', ')}
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <BookOpen className="h-3.5 w-3.5" />
                      {selectedCalc.teacher.subjects.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Total Yearly Earning
                </p>
                <p className="text-base sm:text-xl font-bold">
                  {formatINR(selectedCalc.totalYearlyEarning)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCalc.matchedStudents.length} student
                  {selectedCalc.matchedStudents.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Received Amount
                </p>
                <p className="text-base sm:text-xl font-bold text-green-600">
                  {formatINR(selectedCalc.salaryPaidThisSession)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Remaining Amount
                </p>
                <p className="text-base sm:text-xl font-bold text-orange-600">
                  {formatINR(Math.max(0, selectedCalc.totalYearlyEarning - selectedCalc.salaryPaidThisSession))}
                </p>
              </CardContent>
            </Card>
            <Card className="border-[#2F2FE4]/30 bg-[#2F2FE4]/5">
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Current Month Salary
                </p>
                <p className="text-lg sm:text-2xl font-bold text-[#2F2FE4]">
                  {formatINR(Math.round(selectedCalc.currentMonthSalary))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getRemainingMonthsInSession()} month
                  {getRemainingMonthsInSession() !== 1 ? 's' : ''} remaining
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Salary Calculation Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#2F2FE4]" />
                Salary Calculation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Yearly Earning</span>
                  <span className="font-medium">{formatINR(selectedCalc.totalYearlyEarning)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary Already Paid</span>
                  <span className="font-medium text-orange-600">
                    - {formatINR(selectedCalc.salaryPaidThisSession)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Amount</span>
                  <span className="font-medium">
                    {formatINR(Math.max(0, selectedCalc.totalYearlyEarning - selectedCalc.salaryPaidThisSession))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Months</span>
                  <span className="font-medium">{getRemainingMonthsInSession()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Monthly Salary</span>
                  <span className="text-[#2F2FE4]">
                    {formatINR(Math.round(selectedCalc.currentMonthSalary))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Salary Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pay Salary for {MONTH_NAMES[getCurrentMonth()]} {getCurrentYear()}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Payment Mode
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Offline">Offline (Cash/UPI)</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-[#2F2FE4]">
                  {formatINR(Math.round(selectedCalc.currentMonthSalary))}
                </p>
              </div>
              <Button
                className="w-full bg-[#2F2FE4] hover:bg-[#2525c0] h-12 text-base"
                onClick={handlePaySalary}
                disabled={paying || selectedCalc.currentMonthSalary <= 0}
              >
                {paying ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CreditCard className="h-5 w-5 mr-2" />
                )}
                Pay Salary
              </Button>
            </CardContent>
          </Card>

          {/* Salary History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#2F2FE4]" />
                Salary History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCalc.salaryHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No salary payments yet
                </p>
              ) : (
                <>
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Paid On</TableHead>
                          <TableHead>Earning</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead className="text-right">Slip</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCalc.salaryHistory.map((sp) => (
                          <TableRow key={sp.id}>
                            <TableCell>
                              {MONTH_NAMES[sp.month]} {sp.year}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatINR(sp.amount)}
                            </TableCell>
                            <TableCell>{sp.paymentMode}</TableCell>
                            <TableCell>
                              {new Date(sp.paidAt).toLocaleDateString('en-IN')}
                            </TableCell>
                            <TableCell>{formatINR(sp.totalYearlyEarning)}</TableCell>
                            <TableCell>{formatINR(sp.totalReceivedFees)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewSlip(sp)}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                View Slip
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-3">
                    {selectedCalc.salaryHistory.map((sp) => (
                      <Card key={sp.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">
                                {MONTH_NAMES[sp.month]} {sp.year}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(sp.paidAt).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <Badge variant="outline">{sp.paymentMode}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-semibold text-green-600">
                              {formatINR(sp.amount)}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSlip(sp)}
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1" />
                              View Slip
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Matched Students */}
          {selectedCalc.matchedStudents.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#2F2FE4]" />
                  Matched Students ({selectedCalc.matchedStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  {/* Desktop */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Subject Fee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCalc.matchedStudents.map((s) => {
                          // Get teacher's subjects for this student's class
                          const classMapping = selectedCalc.teacher.classSubjects?.find(
                            (cs) => cs.className === s.className
                          )
                          const teacherSubjects = classMapping?.subjects || []
                          const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
                          const relevantFees = s.subjectFees.filter((sf) => {
                            if (teacherSubjects.includes(sf.subject)) return true
                            if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
                            return false
                          })
                          return relevantFees.map((sf, idx) => (
                            <TableRow key={`${s.id}-${sf.id}`}>
                              {idx === 0 ? (
                                <TableCell rowSpan={relevantFees.length} className="font-medium">
                                  {s.name}
                                </TableCell>
                              ) : null}
                              {idx === 0 ? (
                                <TableCell rowSpan={relevantFees.length}>
                                  {s.className}
                                </TableCell>
                              ) : null}
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">{sf.subject}</Badge>
                              </TableCell>
                              <TableCell>{formatINR(sf.yearlyFee)}</TableCell>
                            </TableRow>
                          ))
                        }).flat()}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    {selectedCalc.matchedStudents.map((s) => {
                      const classMapping = selectedCalc.teacher.classSubjects?.find(
                        (cs) => cs.className === s.className
                      )
                      const teacherSubjects = classMapping?.subjects || []
                      const teacherHas48Subjects = teacherSubjects.some((t) => CLASS_4_8_SUBJECTS.includes(t))
                      const relevantFees = s.subjectFees.filter((sf) => {
                        if (teacherSubjects.includes(sf.subject)) return true
                        if (sf.subject === 'All Subjects' && teacherHas48Subjects) return true
                        return false
                      })
                      return (
                        <div key={s.id} className="rounded-lg border p-2.5 space-y-1.5">
                          <div className="flex justify-between items-center">
                            <p className="font-medium text-sm">{s.name}</p>
                            <Badge variant="outline" className="text-xs">Class {s.className}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {relevantFees.map((sf) => (
                              <span
                                key={sf.id}
                                className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded"
                              >
                                {sf.subject}: {formatINR(sf.yearlyFee)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Confirm Payment AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Salary Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to pay{' '}
              <span className="font-semibold text-foreground">
                {selectedCalc ? formatINR(Math.round(selectedCalc.currentMonthSalary)) : '₹0'}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-foreground">
                {selectedCalc?.teacher.name}
              </span>{' '}
              for {MONTH_NAMES[getCurrentMonth()]} {getCurrentYear()} via {paymentMode}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPaySalary}
              disabled={paying}
              className="bg-[#2F2FE4] hover:bg-[#2525c0]"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm & Pay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog - Salary Slip */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Salary Paid Successfully
            </DialogTitle>
            <DialogDescription>
              Salary payment has been recorded
            </DialogDescription>
          </DialogHeader>
          {lastSalaryPayment && selectedCalc && (
            <div className="space-y-4">
              {/* A4 Print-Ready Salary Slip (hidden in dialog, used for printing) */}
              <div id="salary-slip-printable" className="slip-container" style={{ display: 'none' }}>
                {/* Header */}
                <div className="header">
                  <h1>SANKALP VIDYA ACADEMY</h1>
                  <p>Salary Payment Receipt</p>
                </div>

                {/* Teacher Details */}
                <div className="section">
                  <div className="section-title">Teacher Details</div>
                  <div className="info-grid">
                    <div><span className="label">Name:</span></div>
                    <div><span className="value">{selectedCalc.teacher.name}</span></div>
                    <div><span className="label">Subjects:</span></div>
                    <div><span className="value">{selectedCalc.teacher.subjects.join(', ')}</span></div>
                    <div><span className="label">Classes:</span></div>
                    <div><span className="value">{selectedCalc.teacher.classes.join(', ')}</span></div>
                  </div>
                </div>

                {/* Earning Details */}
                <div className="section">
                  <div className="section-title">Earning Details</div>
                  <div className="payment-box">
                    <div className="payment-row">
                      <span>Total Yearly Earning:</span>
                      <span>{formatINR(lastSalaryPayment.totalYearlyEarning)}</span>
                    </div>
                    <div className="payment-row">
                      <span>Received Salary (Total Paid):</span>
                      <span>{formatINR(lastSalaryPayment.totalReceivedFees + lastSalaryPayment.amount)}</span>
                    </div>
                    <div className="payment-row remaining">
                      <span>Remaining Salary:</span>
                      <span>{formatINR(Math.max(0, lastSalaryPayment.totalYearlyEarning - lastSalaryPayment.totalReceivedFees - lastSalaryPayment.amount))}</span>
                    </div>
                  </div>
                </div>

                {/* Current Payment Details */}
                <div className="section">
                  <div className="section-title">Current Payment</div>
                  <div className="payment-box">
                    <div className="payment-row total">
                      <span>Current Month Salary:</span>
                      <span>{formatINR(lastSalaryPayment.amount)}</span>
                    </div>
                    <div className="payment-row">
                      <span>Month:</span>
                      <span>{MONTH_NAMES[lastSalaryPayment.month]} {lastSalaryPayment.year}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Date:</span>
                      <span>{lastSalaryPayment.paidAt ? new Date(lastSalaryPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Mode:</span>
                      <span>{lastSalaryPayment.paymentMode}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer">
                  <div>
                    <p>This is a system generated receipt.</p>
                    <p>Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="signature">
                    <div className="line"></div>
                    <div className="title">Director</div>
                  </div>
                </div>
              </div>

              {/* Dialog-visible Salary Slip (screen version) */}
              <Card>
                <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-xl text-[#2F2FE4]">
                    Sankalp Vidya Academy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">
                    Salary Payment Receipt
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />

                  {/* Teacher Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Teacher Details</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-semibold">{selectedCalc.teacher.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subjects:</span>
                        <p className="font-semibold text-xs">{selectedCalc.teacher.subjects.join(', ')}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Classes:</span>
                        <p className="font-semibold">{selectedCalc.teacher.classes.join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Earning Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Earning Details</h4>
                    <div className="rounded-lg bg-[#2F2FE4]/5 border border-[#2F2FE4]/20 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Yearly Earning:</span>
                        <span className="font-semibold">{formatINR(lastSalaryPayment.totalYearlyEarning)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Received Salary (Total Paid):</span>
                        <span className="font-semibold text-green-600">{formatINR(lastSalaryPayment.totalReceivedFees + lastSalaryPayment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining Salary:</span>
                        <span className="font-semibold text-red-600">{formatINR(Math.max(0, lastSalaryPayment.totalYearlyEarning - lastSalaryPayment.totalReceivedFees - lastSalaryPayment.amount))}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Current Payment */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Current Payment</h4>
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Current Month Salary:</span>
                        <span className="text-xl font-bold text-green-600">{formatINR(lastSalaryPayment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Month:</span>
                        <span className="font-semibold">{MONTH_NAMES[lastSalaryPayment.month]} {lastSalaryPayment.year}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Date:</span>
                        <span className="font-semibold">
                          {lastSalaryPayment.paidAt
                            ? new Date(lastSalaryPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Mode:</span>
                        <span className="font-semibold">{lastSalaryPayment.paymentMode}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSuccessOpen(false)}
                >
                  Done
                </Button>
                <Button
                  className="flex-1 bg-[#2F2FE4] hover:bg-[#2525c0]"
                  onClick={printSalarySlip}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Salary Slip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Past Salary Slip Dialog */}
      <Dialog open={viewSlipOpen} onOpenChange={setViewSlipOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#2F2FE4]" />
              Salary Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Salary slip for past payment
            </DialogDescription>
          </DialogHeader>
          {viewSlipPayment && selectedCalc && (
            <div className="space-y-4">
              {/* A4 Print-Ready Salary Slip (hidden in dialog, used for printing) */}
              <div id="salary-slip-view-printable" className="slip-container" style={{ display: 'none' }}>
                {/* Header */}
                <div className="header">
                  <h1>SANKALP VIDYA ACADEMY</h1>
                  <p>Salary Payment Receipt</p>
                </div>

                {/* Teacher Details */}
                <div className="section">
                  <div className="section-title">Teacher Details</div>
                  <div className="info-grid">
                    <div><span className="label">Name:</span></div>
                    <div><span className="value">{selectedCalc.teacher.name}</span></div>
                    <div><span className="label">Subjects:</span></div>
                    <div><span className="value">{selectedCalc.teacher.subjects.join(', ')}</span></div>
                    <div><span className="label">Classes:</span></div>
                    <div><span className="value">{selectedCalc.teacher.classes.join(', ')}</span></div>
                  </div>
                </div>

                {/* Earning Details */}
                <div className="section">
                  <div className="section-title">Earning Details</div>
                  <div className="payment-box">
                    <div className="payment-row">
                      <span>Total Yearly Earning:</span>
                      <span>{formatINR(viewSlipPayment.totalYearlyEarning)}</span>
                    </div>
                    <div className="payment-row">
                      <span>Received Salary (Total Paid):</span>
                      <span>{formatINR(viewSlipPayment.totalReceivedFees + viewSlipPayment.amount)}</span>
                    </div>
                    <div className="payment-row remaining">
                      <span>Remaining Salary:</span>
                      <span>{formatINR(Math.max(0, viewSlipPayment.totalYearlyEarning - viewSlipPayment.totalReceivedFees - viewSlipPayment.amount))}</span>
                    </div>
                  </div>
                </div>

                {/* Current Payment Details */}
                <div className="section">
                  <div className="section-title">Current Payment</div>
                  <div className="payment-box">
                    <div className="payment-row total">
                      <span>Current Month Salary:</span>
                      <span>{formatINR(viewSlipPayment.amount)}</span>
                    </div>
                    <div className="payment-row">
                      <span>Month:</span>
                      <span>{MONTH_NAMES[viewSlipPayment.month]} {viewSlipPayment.year}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Date:</span>
                      <span>{viewSlipPayment.paidAt ? new Date(viewSlipPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Mode:</span>
                      <span>{viewSlipPayment.paymentMode}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer">
                  <div>
                    <p>This is a system generated receipt.</p>
                    <p>Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="signature">
                    <div className="line"></div>
                    <div className="title">Director</div>
                  </div>
                </div>
              </div>

              {/* Dialog-visible Salary Slip (screen version) */}
              <Card>
                <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-xl text-[#2F2FE4]">
                    Sankalp Vidya Academy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">
                    Salary Payment Receipt
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />

                  {/* Teacher Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Teacher Details</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-semibold">{selectedCalc.teacher.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subjects:</span>
                        <p className="font-semibold text-xs">{selectedCalc.teacher.subjects.join(', ')}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Classes:</span>
                        <p className="font-semibold">{selectedCalc.teacher.classes.join(', ')}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Earning Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Earning Details</h4>
                    <div className="rounded-lg bg-[#2F2FE4]/5 border border-[#2F2FE4]/20 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Yearly Earning:</span>
                        <span className="font-semibold">{formatINR(viewSlipPayment.totalYearlyEarning)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Received Salary (Total Paid):</span>
                        <span className="font-semibold text-green-600">{formatINR(viewSlipPayment.totalReceivedFees + viewSlipPayment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining Salary:</span>
                        <span className="font-semibold text-red-600">{formatINR(Math.max(0, viewSlipPayment.totalYearlyEarning - viewSlipPayment.totalReceivedFees - viewSlipPayment.amount))}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Current Payment */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Current Payment</h4>
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Current Month Salary:</span>
                        <span className="text-xl font-bold text-green-600">{formatINR(viewSlipPayment.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Month:</span>
                        <span className="font-semibold">{MONTH_NAMES[viewSlipPayment.month]} {viewSlipPayment.year}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Date:</span>
                        <span className="font-semibold">
                          {viewSlipPayment.paidAt
                            ? new Date(viewSlipPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Mode:</span>
                        <span className="font-semibold">{viewSlipPayment.paymentMode}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setViewSlipOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 bg-[#2F2FE4] hover:bg-[#2525c0]"
                  onClick={printViewSalarySlip}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Salary Slip
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
