'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Search,
  IndianRupee,
  CreditCard,
  Printer,
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
    const slipEl = document.getElementById('fee-slip-printable')
    if (!slipEl) return
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fee Slip - ${selectedStudent?.name || 'Student'}</title>
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
          table.monthly-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          table.monthly-table th, table.monthly-table td { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: center; }
          table.monthly-table th { background: #f3f4f6; font-weight: 600; }
          table.monthly-table td.paid { background: #dcfce7; color: #166534; }
          table.monthly-table td.unpaid { background: #fee2e2; color: #991b1b; }
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

  const currentMonthFee = selectedStudent
    ? getMonthFeeAmount(selectedStudent, parseInt(payingMonth), parseInt(payingYear))
    : 0
  const currentMonthPaid = selectedStudent
    ? getMonthPaid(selectedStudent, parseInt(payingMonth), parseInt(payingYear))
    : 0
  const currentMonthDue = selectedStudent
    ? currentMonthFee - currentMonthPaid
    : 0

  // Get all monthly payments for the fee slip breakdown
  const sessionYear = getSessionYear()
  const studentPayments = selectedStudent?.feePayments || []

  // Calculate adjusted monthly amounts for fee slip breakdown
  // This handles carry-forward adjustments so the slip shows correct data
  function getAdjustedMonthData(student: StudentData, month: number, year: number) {
    const payment = student.feePayments.find((p) => p.month === month && p.year === year)
    const baseFee = getMonthFeeAmount(student, month, year)

    // Calculate carry-forward from all previous months in this session
    let carryForward = 0
    for (const m of SESSION_MONTHS) {
      const yr = m >= 4 ? sessionYear : sessionYear + 1
      if (m === month && yr === year) break
      const prevPayment = student.feePayments.find((p) => p.month === m && p.year === yr)
      if (prevPayment && prevPayment.paidAt) {
        const prevBaseFee = getMonthFeeAmount(student, m, yr)
        const prevDue = prevPayment.amountDue
        carryForward += (prevPayment.amountPaid - prevDue)
      }
    }

    const adjustedDue = payment && payment.paidAt ? payment.amountDue : Math.max(0, baseFee + carryForward)
    const paid = payment && payment.paidAt ? payment.amountPaid : 0

    return { adjustedDue, paid, baseFee }
  }

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
                  />
                </div>
                {amountToPay && parseFloat(amountToPay) > currentMonthDue && (
                  <p className="text-xs text-amber-600 mt-1">
                    Extra payment will be adjusted in the next month
                  </p>
                )}
              </div>

              {/* Payment Mode - Only Online / Offline */}
              <div>
                <Label className="mb-1.5 block text-sm font-medium">
                  Payment Mode
                </Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Offline">Offline</SelectItem>
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
                parseFloat(amountToPay) <= 0
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

      {/* Fee Slip Dialog - A4 Print-Ready */}
      <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Payment Successful
            </DialogTitle>
            <DialogDescription>Fee has been collected successfully</DialogDescription>
          </DialogHeader>
          {lastPayment && selectedStudent && (
            <div className="space-y-4">
              {/* A4 Print-Ready Fee Slip (hidden in dialog, used for printing) */}
              <div id="fee-slip-printable" className="slip-container" style={{ display: 'none' }}>
                {/* Header */}
                <div className="header">
                  <h1>SANKALP VIDYA ACADEMY</h1>
                  <p>Fee Payment Receipt</p>
                </div>

                {/* Student Details */}
                <div className="section">
                  <div className="section-title">Student Details</div>
                  <div className="info-grid">
                    <div><span className="label">Name:</span></div>
                    <div><span className="value">{selectedStudent.name}</span></div>
                    <div><span className="label">Class:</span></div>
                    <div><span className="value">{selectedStudent.className}</span></div>
                    <div><span className="label">Subjects:</span></div>
                    <div><span className="value">{selectedStudent.subjects?.join(', ') || '-'}</span></div>
                    <div><span className="label">DOB:</span></div>
                    <div><span className="value">{selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-IN') : 'N/A'}</span></div>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="section">
                  <div className="section-title">Payment Details</div>
                  <div className="payment-box">
                    <div className="payment-row">
                      <span>Total Yearly Fee:</span>
                      <span>{formatINR(selectedStudent.totalYearlyFee)}</span>
                    </div>
                    <div className="payment-row remaining">
                      <span>Remaining Fee after payment:</span>
                      <span>{formatINR(getRemaining(selectedStudent))}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Date:</span>
                      <span>{lastPayment.paidAt ? new Date(lastPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                    </div>
                    <div className="payment-row">
                      <span>Payment Mode:</span>
                      <span>{lastPayment.paymentMode}</span>
                    </div>
                    <div className="payment-row total">
                      <span>Amount Paid:</span>
                      <span>{formatINR(lastPayment.amountPaid)}</span>
                    </div>
                    <div className="payment-row">
                      <span>Slip No:</span>
                      <span>{lastPayment.slipNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                <div className="section">
                  <div className="section-title">Monthly Breakdown</div>
                  <table className="monthly-table">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Fee</th>
                        <th>Paid</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SESSION_MONTHS.map((m) => {
                        const yr = m >= 4 ? sessionYear : sessionYear + 1
                        const { adjustedDue, paid, baseFee } = getAdjustedMonthData(selectedStudent, m, yr)
                        // Zero fee month = blank row
                        if (baseFee === 0 && paid === 0) {
                          return (
                            <tr key={m}>
                              <td>{MONTH_SHORT[m]} {yr}</td>
                              <td>-</td>
                              <td>-</td>
                              <td></td>
                            </tr>
                          )
                        }
                        const isPaid = paid >= adjustedDue && paid > 0
                        return (
                          <tr key={m}>
                            <td>{MONTH_SHORT[m]} {yr}</td>
                            <td>{formatINR(adjustedDue)}</td>
                            <td>{paid > 0 ? formatINR(paid) : '-'}</td>
                            <td className={isPaid ? 'paid' : (paid > 0 ? 'unpaid' : 'unpaid')}>
                              {paid === 0 ? 'Unpaid' : isPaid ? 'Paid' : 'Partial'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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

              {/* Dialog-visible Fee Slip (screen version) */}
              <Card id="fee-slip">
                <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-xl text-[#2F2FE4]">
                    Sankalp Vidya Academy
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">
                    Fee Payment Receipt
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />

                  {/* Student Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Student Details</h4>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-semibold">{selectedStudent.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Class:</span>
                        <p className="font-semibold">{selectedStudent.className}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subjects:</span>
                        <p className="font-semibold text-xs">{selectedStudent.subjects?.join(', ') || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">DOB:</span>
                        <p className="font-semibold">
                          {selectedStudent.dob ? new Date(selectedStudent.dob).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Details */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Payment Details</h4>
                    <div className="rounded-lg bg-[#2F2FE4]/5 border border-[#2F2FE4]/20 p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Yearly Fee:</span>
                        <span className="font-semibold">{formatINR(selectedStudent.totalYearlyFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining Fee:</span>
                        <span className="font-semibold text-red-600">{formatINR(getRemaining(selectedStudent))}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Date:</span>
                        <span className="font-semibold">
                          {lastPayment.paidAt
                            ? new Date(lastPayment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Mode:</span>
                        <span className="font-semibold">{lastPayment.paymentMode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount Paid:</span>
                        <span className="text-xl font-bold text-green-600">{formatINR(lastPayment.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slip No: {lastPayment.slipNumber}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Monthly Breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#2F2FE4] uppercase tracking-wide mb-2">Monthly Breakdown</h4>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Month</TableHead>
                            <TableHead className="text-xs text-right">Fee</TableHead>
                            <TableHead className="text-xs text-right">Paid</TableHead>
                            <TableHead className="text-xs text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {SESSION_MONTHS.map((m) => {
                            const yr = m >= 4 ? sessionYear : sessionYear + 1
                            const { adjustedDue, paid, baseFee } = getAdjustedMonthData(selectedStudent, m, yr)
                            // Zero fee month = skip
                            if (baseFee === 0 && paid === 0) {
                              return (
                                <TableRow key={m}>
                                  <TableCell className="text-xs py-1">{MONTH_SHORT[m]}</TableCell>
                                  <TableCell className="text-xs py-1 text-right">-</TableCell>
                                  <TableCell className="text-xs py-1 text-right">-</TableCell>
                                  <TableCell className="text-xs py-1 text-center">-</TableCell>
                                </TableRow>
                              )
                            }
                            const isPaid = paid >= adjustedDue && paid > 0
                            return (
                              <TableRow key={m}>
                                <TableCell className="text-xs py-1">{MONTH_SHORT[m]}</TableCell>
                                <TableCell className="text-xs py-1 text-right">{formatINR(adjustedDue)}</TableCell>
                                <TableCell className="text-xs py-1 text-right">{paid > 0 ? formatINR(paid) : '-'}</TableCell>
                                <TableCell className="text-xs py-1 text-center">
                                  <Badge
                                    variant="outline"
                                    className={
                                      isPaid
                                        ? 'bg-green-100 text-green-700 border-green-200'
                                        : paid > 0
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                    }
                                  >
                                    {paid === 0 ? 'Unpaid' : isPaid ? 'Paid' : 'Partial'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-end pt-2 text-xs text-muted-foreground">
                    <p>This is a system generated receipt</p>
                    <div className="text-center">
                      <div className="border-t border-foreground/30 w-32 mb-1"></div>
                      <p className="font-semibold text-foreground">Director</p>
                    </div>
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
                  Print Slip
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSlipOpen(false)}
                >
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
