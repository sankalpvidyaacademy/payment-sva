'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTH_NAMES, SESSION_MONTHS, MONTH_SHORT } from '@/lib/types'
import type { StudentData, FeePayment } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Download,
  Lock,
  User,
  BookOpen,
  CreditCard,
  Eye,
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

// Helper to get per-month fee amount from distributions
function getMonthFeeAmount(student: StudentData, month: number, year: number): number {
  const dist = student.monthlyFeeDistributions?.find(
    (d) => d.month === month && d.year === year
  )
  return dist ? dist.amount : student.monthlyFee
}

export default function StudentPanel() {
  const { user, studentView, refreshKey } = useAppStore()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [feePayments, setFeePayments] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null)

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const sessionYear = getSessionYear()

  useEffect(() => {
    if (!user) return
    let active = true

    fetch('/api/students')
      .then((res) => (res.ok ? res.json() : null))
      .then((allStudents: StudentData[] | null) => {
        if (!active || !allStudents) return
        const myStudent = allStudents.find((s) => s.userId === user!.id)
        setStudent(myStudent || null)

        if (myStudent) {
          fetch(`/api/fees?studentId=${myStudent.id}`)
            .then((fRes) => (fRes.ok ? fRes.json() : null))
            .then((feesData) => {
              if (active && feesData) setFeePayments(feesData)
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!student) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8" />
          <p>Student profile not found. Please contact admin.</p>
        </CardContent>
      </Card>
    )
  }

  // Calculate fee summary
  const totalPaid = feePayments.reduce((sum, fp) => sum + fp.amountPaid, 0)
  const remaining = student.totalYearlyFee - totalPaid
  const completionPercent = student.totalYearlyFee > 0
    ? Math.min(Math.round((totalPaid / student.totalYearlyFee) * 100), 100)
    : 0

  // ============ Dashboard View ============
  if (studentView === 'dashboard') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Student Dashboard</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                Total Fees
              </CardDescription>
              <CardTitle className="text-xl">{formatINR(student.totalYearlyFee)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Session {sessionYear}-{(sessionYear + 1) % 100}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Paid Fees
              </CardDescription>
              <CardTitle className="text-xl text-green-600 dark:text-green-400">
                {formatINR(totalPaid)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{feePayments.length} payment(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Remaining Fees
              </CardDescription>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                {formatINR(remaining)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {completionPercent}% completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fee Payment Progress</CardTitle>
            <CardDescription>
              {formatINR(totalPaid)} of {formatINR(student.totalYearlyFee)} paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Progress value={completionPercent} className="h-4" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-medium">{completionPercent}%</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============ Fees View ============
  if (studentView === 'fees') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Fee Details</h2>
        </div>

        {/* Fee Slip Dialog */}
        <Dialog open={slipDialogOpen} onOpenChange={setSlipDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Fee Slip</DialogTitle>
              <DialogDescription>Payment receipt details</DialogDescription>
            </DialogHeader>
            {selectedPayment && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-center border-b pb-3">
                    <h3 className="font-bold text-lg">Sankalp Vidya Academy</h3>
                    <p className="text-sm text-muted-foreground">Fee Receipt</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Student Name:</span>
                    </div>
                    <div className="font-medium">{student.name}</div>
                    <div>
                      <span className="text-muted-foreground">Class:</span>
                    </div>
                    <div className="font-medium">{student.className}</div>
                    <div>
                      <span className="text-muted-foreground">Month:</span>
                    </div>
                    <div className="font-medium">
                      {MONTH_NAMES[selectedPayment.month]} {selectedPayment.year}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount Paid:</span>
                    </div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {formatINR(selectedPayment.amountPaid)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount Due:</span>
                    </div>
                    <div className="font-medium">
                      {formatINR(selectedPayment.amountDue)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Mode:</span>
                    </div>
                    <div className="font-medium">{selectedPayment.paymentMode}</div>
                    <div>
                      <span className="text-muted-foreground">Slip Number:</span>
                    </div>
                    <div className="font-medium">{selectedPayment.slipNumber || 'N/A'}</div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                    </div>
                    <div className="font-medium">
                      {selectedPayment.paidAt
                        ? new Date(selectedPayment.paidAt).toLocaleDateString('en-IN')
                        : 'N/A'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={() => {
                    const slipText = [
                      'Sankalp Vidya Academy - Fee Receipt',
                      '─────────────────────────',
                      `Student: ${student.name}`,
                      `Class: ${student.className}`,
                      `Month: ${MONTH_NAMES[selectedPayment.month]} ${selectedPayment.year}`,
                      `Amount Due: ${formatINR(selectedPayment.amountDue)}`,
                      `Amount Paid: ${formatINR(selectedPayment.amountPaid)}`,
                      `Payment Mode: ${selectedPayment.paymentMode}`,
                      `Slip Number: ${selectedPayment.slipNumber || 'N/A'}`,
                      `Date: ${selectedPayment.paidAt ? new Date(selectedPayment.paidAt).toLocaleDateString('en-IN') : 'N/A'}`,
                    ].join('\n')
                    const blob = new Blob([slipText], { type: 'text/plain' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `fee-slip-${MONTH_SHORT[selectedPayment.month]}-${selectedPayment.year}.txt`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download Slip
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Monthly Breakdown */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SESSION_MONTHS.map((m) => {
            const year = m >= 4 ? sessionYear : sessionYear + 1
            const payment = feePayments.find(
              (fp) => fp.month === m && fp.year === year
            )

            let status: 'paid' | 'unpaid' | 'partial'
            let statusLabel: string
            let statusClass: string

            if (!payment || payment.amountPaid === 0) {
              status = 'unpaid'
              statusLabel = 'Unpaid'
              statusClass = 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-200'
            } else if (payment.amountPaid >= payment.amountDue) {
              status = 'paid'
              statusLabel = 'Paid'
              statusClass = 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-200'
            } else {
              status = 'partial'
              statusLabel = 'Partial'
              statusClass = 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200'
            }

            const amountDue = getMonthFeeAmount(student, m, year)
            const amountPaid = payment?.amountPaid || 0

            return (
              <Card key={m} className="relative overflow-hidden">
                {/* Status indicator stripe */}
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${
                    status === 'paid'
                      ? 'bg-green-500'
                      : status === 'partial'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
                <CardHeader className="pb-2 pl-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {MONTH_NAMES[m]} {year}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusClass}`}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pl-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee Amount</span>
                    <span className="font-medium">{formatINR(amountDue)}</span>
                  </div>
                  {payment && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatINR(amountPaid)}
                      </span>
                    </div>
                  )}
                  {payment && amountPaid < amountDue && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatINR(amountDue - amountPaid)}
                      </span>
                    </div>
                  )}
                  {payment && (
                    <div className="flex gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          setSelectedPayment(payment)
                          setSlipDialogOpen(true)
                        }}
                      >
                        <Eye className="h-3 w-3" />
                        View Slip
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const slipText = [
                            'Sankalp Vidya Academy - Fee Receipt',
                            '─────────────────────────',
                            `Student: ${student.name}`,
                            `Class: ${student.className}`,
                            `Month: ${MONTH_NAMES[m]} ${year}`,
                            `Amount Due: ${formatINR(amountDue)}`,
                            `Amount Paid: ${formatINR(amountPaid)}`,
                            `Payment Mode: ${payment.paymentMode}`,
                            `Slip Number: ${payment.slipNumber || 'N/A'}`,
                            `Date: ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN') : 'N/A'}`,
                          ].join('\n')
                          const blob = new Blob([slipText], { type: 'text/plain' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `fee-slip-${MONTH_SHORT[m]}-${year}.txt`
                          a.click()
                          URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Fees</p>
                <p className="font-semibold">{formatINR(student.totalYearlyFee)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {formatINR(totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                <p className="font-semibold text-red-600 dark:text-red-400">
                  {formatINR(remaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============ Profile View ============
  if (studentView === 'profile') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Profile</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Student Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{student.name}</span>
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
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Class</span>
                  <Badge variant="outline">{student.className}</Badge>
                </div>
                <Separator />
                <div className="text-sm">
                  <span className="text-muted-foreground">Subjects</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {student.subjects.map((sub) => (
                      <Badge key={sub} variant="outline" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Fee</span>
                  <span className="font-medium">{formatINR(student.monthlyFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Yearly Fee</span>
                  <span className="font-medium">{formatINR(student.totalYearlyFee)}</span>
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
                <Label htmlFor="stu-old-pw">Old Password</Label>
                <Input
                  id="stu-old-pw"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stu-new-pw">New Password</Label>
                <Input
                  id="stu-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stu-confirm-pw">Confirm New Password</Label>
                <Input
                  id="stu-confirm-pw"
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
