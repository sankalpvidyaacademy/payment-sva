'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Search,
  IndianRupee,
  CreditCard,
  Printer,
  Download,
  User,
  GraduationCap,
  CalendarDays,
  Receipt,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
import { Label } from '@/components/ui/label'
import {
  CLASS_OPTIONS,
  MONTH_NAMES,
  MONTH_SHORT,
  SESSION_MONTHS,
} from '@/lib/types'
import type { StudentData, FeePayment } from '@/lib/types'

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

// Helper to get per-month fee amount from distributions
function getMonthFeeAmount(student: StudentData, month: number, year: number): number {
  const dist = student.monthlyFeeDistributions?.find(
    (d) => d.month === month && d.year === year
  )
  return dist ? dist.amount : student.monthlyFee
}

export function FeeCollection() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Payment dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [amountToPay, setAmountToPay] = useState('')
  const [paymentMode, setPaymentMode] = useState<string>('Offline')
  const [payingMonth, setPayingMonth] = useState<string>(String(getCurrentMonth()))
  const [payingYear, setPayingYear] = useState<string>(String(getCurrentYear()))
  const [paying, setPaying] = useState(false)

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Fee slip
  const [slipOpen, setSlipOpen] = useState(false)
  const [lastPayment, setLastPayment] = useState<FeePayment | null>(null)

  // Payment history dialog
  const [historyOpen, setHistoryOpen] = useState(false)
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([])
  const [historyStudent, setHistoryStudent] = useState<StudentData | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedClass && selectedClass !== 'all') {
        params.set('className', selectedClass)
      }
      const res = await fetch(`/api/students?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch students')
      const data = await res.json()
      setStudents(data)
    } catch {
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function getTotalPaid(student: StudentData): number {
    return student.feePayments.reduce((sum, p) => sum + p.amountPaid, 0)
  }

  function getRemaining(student: StudentData): number {
    return Math.max(0, student.totalYearlyFee - getTotalPaid(student))
  }

  function getMonthPaid(student: StudentData, month: number, year: number): number {
    const payment = student.feePayments.find(
      (p) => p.month === month && p.year === year
    )
    return payment ? payment.amountPaid : 0
  }

  function handleOpenPayDialog(student: StudentData) {
    setSelectedStudent(student)
    const cm = getCurrentMonth()
    const cy = getCurrentYear()
    setPayingMonth(String(cm))
    setPayingYear(String(cy))
    setAmountToPay('')
    setPaymentMode('Offline')
    setPayDialogOpen(true)
  }

  async function handlePayFee() {
    if (!selectedStudent) return
    const amount = parseFloat(amountToPay)
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setConfirmOpen(true)
  }

  async function confirmPayFee() {
    if (!selectedStudent) return
    setPaying(true)
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          month: parseInt(payingMonth),
          year: parseInt(payingYear),
          amountPaid: parseFloat(amountToPay),
          paymentMode,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Payment failed')
      }
      const payment = await res.json()
      setLastPayment(payment)
      toast.success('Fee collected successfully!', {
        description: `Slip No: ${payment.slipNumber}`,
      })
      setPayDialogOpen(false)
      setConfirmOpen(false)
      setSlipOpen(true)
      fetchStudents()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Payment failed')
    } finally {
      setPaying(false)
    }
  }

  async function handleViewHistory(student: StudentData) {
    setHistoryStudent(student)
    setHistoryLoading(true)
    setHistoryOpen(true)
    try {
      const res = await fetch(`/api/fees?studentId=${student.id}`)
      if (!res.ok) throw new Error('Failed to fetch history')
      const data = await res.json()
      setPaymentHistory(data)
    } catch {
      toast.error('Failed to load payment history')
    } finally {
      setHistoryLoading(false)
    }
  }

  function printSlip() {
    window.print()
  }

  const currentMonthFee = selectedStudent
    ? getMonthFeeAmount(selectedStudent, parseInt(payingMonth), parseInt(payingYear))
    : 0
  const currentMonthPaid = selectedStudent
    ? getMonthPaid(selectedStudent, parseInt(payingMonth), parseInt(payingYear))
    : 0
  const currentMonthDue = selectedStudent
    ? currentMonthFee - currentMonthPaid
    : 0

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fee Collection</h2>
          <p className="text-muted-foreground">Collect and manage student fees</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-48">
              <GraduationCap className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASS_OPTIONS.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  Class {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students found. Try changing the class filter.
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
                      <TableHead>Class</TableHead>
                      <TableHead>Total Fees</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const paid = getTotalPaid(student)
                      const remaining = getRemaining(student)
                      const percentage =
                        student.totalYearlyFee > 0
                          ? Math.round((paid / student.totalYearlyFee) * 100)
                          : 0
                      return (
                        <TableRow
                          key={student.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleOpenPayDialog(student)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {student.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.className}</Badge>
                          </TableCell>
                          <TableCell>{formatINR(student.totalYearlyFee)}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatINR(paid)}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {formatINR(remaining)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={remaining === 0 ? 'default' : 'destructive'}
                              className={
                                remaining === 0
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                  : ''
                              }
                            >
                              {remaining === 0 ? 'Fully Paid' : `${percentage}%`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewHistory(student)
                                }}
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-[#2F2FE4] hover:bg-[#2525c0]"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenPayDialog(student)
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {filteredStudents.map((student) => {
              const paid = getTotalPaid(student)
              const remaining = getRemaining(student)
              return (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleOpenPayDialog(student)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{student.name}</span>
                        </div>
                        <Badge variant="outline">Class {student.className}</Badge>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#2F2FE4] hover:bg-[#2525c0]"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPayDialog(student)
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-sm">
                          {formatINR(student.totalYearlyFee)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-sm text-green-600">
                          {formatINR(paid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className="font-semibold text-sm text-red-600">
                          {formatINR(remaining)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewHistory(student)
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Fee Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#2F2FE4]" />
              Collect Fee
            </DialogTitle>
            <DialogDescription>
              Record a fee payment for the student
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              {/* Student Info */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#2F2FE4]/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-[#2F2FE4]" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedStudent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Class {selectedStudent.className}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fee Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                  <p className="font-bold text-sm">
                    {formatINR(selectedStudent.totalYearlyFee)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Already Paid</p>
                  <p className="font-bold text-sm text-green-600">
                    {formatINR(getTotalPaid(selectedStudent))}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="font-bold text-sm text-red-600">
                    {formatINR(getRemaining(selectedStudent))}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Month/Year Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Month</Label>
                  <Select value={payingMonth} onValueChange={setPayingMonth}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_MONTHS.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {MONTH_NAMES[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">Year</Label>
                  <Select value={payingYear} onValueChange={setPayingYear}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={String(getSessionYear())}>
                        {getSessionYear()}
                      </SelectItem>
                      <SelectItem value={String(getSessionYear() + 1)}>
                        {getSessionYear() + 1}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current Month Info */}
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {MONTH_NAMES[parseInt(payingMonth)]} {payingYear} Fee:
                  </span>
                  <span className="font-medium">
                    {formatINR(currentMonthFee)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Already paid this month:</span>
                  <span className="font-medium text-green-600">
                    {formatINR(currentMonthPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Due for this month:</span>
                  <span className="font-medium text-red-600">
                    {formatINR(Math.max(0, currentMonthDue))}
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Amount to Pay
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(e.target.value)}
                    className="pl-9"
                    min="1"
                    max={getRemaining(selectedStudent)}
                  />
                </div>
                {amountToPay && parseFloat(amountToPay) > getRemaining(selectedStudent) && (
                  <p className="text-xs text-red-500 mt-1">
                    Amount exceeds remaining balance
                  </p>
                )}
              </div>

              {/* Payment Mode */}
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
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2F2FE4] hover:bg-[#2525c0]"
              onClick={handlePayFee}
              disabled={
                paying ||
                !amountToPay ||
                parseFloat(amountToPay) <= 0 ||
                (selectedStudent && parseFloat(amountToPay) > getRemaining(selectedStudent))
              }
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CreditCard className="h-4 w-4 mr-1" />
              )}
              Pay Fee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Payment AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to collect{' '}
              <span className="font-semibold text-foreground">
                {formatINR(parseFloat(amountToPay || '0'))}
              </span>{' '}
              from <span className="font-semibold text-foreground">{selectedStudent?.name}</span>{' '}
              for {MONTH_NAMES[parseInt(payingMonth)]} {payingYear} via {paymentMode}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPayFee}
              disabled={paying}
              className="bg-[#2F2FE4] hover:bg-[#2525c0]"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm & Pay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fee Slip Dialog */}
      <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Payment Successful
            </DialogTitle>
            <DialogDescription>Fee has been collected successfully</DialogDescription>
          </DialogHeader>
          {lastPayment && selectedStudent && (
            <div className="space-y-4">
              <Card id="fee-slip">
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-lg">
                    🏫 Sankalp Vidya Academy
                  </CardTitle>
                  <p className="text-center text-sm text-muted-foreground">
                    Fee Payment Slip
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Separator />
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Slip No:</span>
                      <p className="font-semibold">{lastPayment.slipNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-semibold">
                        {lastPayment.paidAt
                          ? new Date(lastPayment.paidAt).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Student:</span>
                      <p className="font-semibold">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Class:</span>
                      <p className="font-semibold">{selectedStudent.className}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Month/Year:</span>
                      <p className="font-semibold">
                        {MONTH_NAMES[lastPayment.month]} {lastPayment.year}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mode:</span>
                      <p className="font-semibold">{lastPayment.paymentMode}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatINR(lastPayment.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Remaining Balance:</span>
                    <span className="font-semibold text-red-600">
                      {formatINR(getRemaining(selectedStudent))}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={printSlip}
                >
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSlipOpen(false)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#2F2FE4]" />
              Payment History
            </DialogTitle>
            <DialogDescription>
              {historyStudent?.name} - Class {historyStudent?.className}
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#2F2FE4]" />
            </div>
          ) : paymentHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payment records found
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Slip</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {MONTH_SHORT[p.month]} {p.year}
                        </TableCell>
                        <TableCell>{formatINR(p.amountDue)}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatINR(p.amountPaid)}
                        </TableCell>
                        <TableCell>{p.paymentMode}</TableCell>
                        <TableCell>
                          {p.paidAt
                            ? new Date(p.paidAt).toLocaleDateString('en-IN')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {p.slipNumber || '—'}
                          </code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden max-h-96 overflow-y-auto space-y-3">
                {paymentHistory.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">
                            {MONTH_NAMES[p.month]} {p.year}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.paidAt
                              ? new Date(p.paidAt).toLocaleDateString('en-IN')
                              : 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline">{p.paymentMode}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-medium text-green-600">
                          {formatINR(p.amountPaid)}
                        </span>
                      </div>
                      {p.slipNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Slip: {p.slipNumber}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
