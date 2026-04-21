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
      // Match students whose className is in teacher's classes AND subjects overlap
      const matchedStudents = allStudents.filter((s) => {
        const classMatch = teacher.classes.includes(s.className)
        const subjectOverlap =
          s.subjects.some((sub) => teacher.subjects.includes(sub)) ||
          teacher.subjects.includes('All Subjects')
        return classMatch && subjectOverlap
      })

      const totalYearlyEarning = matchedStudents.reduce(
        (sum, s) => sum + s.totalYearlyFee,
        0
      )

      // Calculate received fees from matched students
      const matchedStudentIds = new Set(matchedStudents.map((s) => s.id))
      const totalReceivedFees = allFees
        .filter((f) => matchedStudentIds.has(f.studentId))
        .reduce((sum, f) => sum + f.amountPaid, 0)

      // Salary already paid this session
      const salaryHistory = teacher.salaryPayments || []
      const salaryPaidThisSession = salaryHistory
        .filter((sp) => {
          if (sp.month >= 4) return sp.year === sessionYear
          return sp.year === sessionYear + 1
        })
        .reduce((sum, sp) => sum + sp.amount, 0)

      // Current month salary formula
      const remainingMonths = getRemainingMonthsInSession()
      const distributableAmount = Math.max(0, totalReceivedFees - salaryPaidThisSession)
      const currentMonthSalary =
        remainingMonths > 0 ? distributableAmount / remainingMonths : 0

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
          totalReceivedFees: selectedCalc.totalReceivedFees,
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
                  Fees Received So Far
                </p>
                <p className="text-base sm:text-xl font-bold text-green-600">
                  {formatINR(selectedCalc.totalReceivedFees)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Salary Paid This Session
                </p>
                <p className="text-base sm:text-xl font-bold text-orange-600">
                  {formatINR(selectedCalc.salaryPaidThisSession)}
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
                  <span className="text-muted-foreground">Total Fees Received</span>
                  <span className="font-medium">{formatINR(selectedCalc.totalReceivedFees)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary Already Paid</span>
                  <span className="font-medium text-orange-600">
                    - {formatINR(selectedCalc.salaryPaidThisSession)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distributable Amount</span>
                  <span className="font-medium">
                    {formatINR(Math.max(0, selectedCalc.totalReceivedFees - selectedCalc.salaryPaidThisSession))}
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
                          <TableHead>Subjects</TableHead>
                          <TableHead>Yearly Fee</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCalc.matchedStudents.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.className}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {s.subjects.map((sub) => (
                                  <Badge key={sub} variant="secondary" className="text-xs">
                                    {sub}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{formatINR(s.totalYearlyFee)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Mobile */}
                  <div className="sm:hidden space-y-2">
                    {selectedCalc.matchedStudents.map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-2 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Class {s.className} • {s.subjects.join(', ')}
                          </p>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatINR(s.totalYearlyFee)}
                        </span>
                      </div>
                    ))}
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

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
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
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="text-center mb-3">
                    <p className="font-semibold text-lg">
                      {selectedCalc.teacher.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {MONTH_NAMES[lastSalaryPayment.month]} {lastSalaryPayment.year}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                      <p className="font-bold text-green-600 text-lg">
                        {formatINR(lastSalaryPayment.amount)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mode:</span>
                      <p className="font-semibold">{lastSalaryPayment.paymentMode}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Paid On:</span>
                      <p className="font-semibold">
                        {new Date(lastSalaryPayment.paidAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Yearly Earning:</span>
                      <p className="font-semibold">
                        {formatINR(lastSalaryPayment.totalYearlyEarning)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button
                className="w-full bg-[#2F2FE4] hover:bg-[#2525c0]"
                onClick={() => setSuccessOpen(false)}
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
