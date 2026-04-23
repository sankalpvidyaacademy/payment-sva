'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTH_NAMES, SESSION_MONTHS, MONTH_SHORT, CLASS_OPTIONS } from '@/lib/types'
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

export default function TeacherPanel() {
  const { user, teacherView, refreshKey } = useAppStore()
  const [teacher, setTeacher] = useState<TeacherData | null>(null)
  const [students, setStudents] = useState<StudentData[]>([])
  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [slipDialogOpen, setSlipDialogOpen] = useState(false)
  const [selectedSlip, setSelectedSlip] = useState<SalaryPayment | null>(null)

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
                const studentSubjects = s.subjects || []
                return studentSubjects.some((sub) => classMapping.subjects.includes(sub))
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

  // Get expected yearly earning from latest salary payment
  const totalYearlyEarning = paidSalaryMonths.length > 0
    ? paidSalaryMonths[paidSalaryMonths.length - 1].totalYearlyEarning
    : 0
  const remaining = totalYearlyEarning - totalReceived

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
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Teacher Dashboard</h2>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4" />
                Total Yearly Earning
              </CardDescription>
              <CardTitle className="text-xl">{formatINR(totalYearlyEarning)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Session {sessionYear}-{(sessionYear + 1) % 100}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Received Amount
              </CardDescription>
              <CardTitle className="text-xl text-green-600 dark:text-green-400">
                {formatINR(totalReceived)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{paidSalaryMonths.length} month(s) paid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                Remaining Amount
              </CardDescription>
              <CardTitle className="text-xl text-orange-600 dark:text-orange-400">
                {formatINR(remaining)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {SESSION_MONTHS.length - paidSalaryMonths.length} month(s) pending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Salary Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Salary Status</CardTitle>
            <CardDescription>April {sessionYear} - March {sessionYear + 1}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {SESSION_MONTHS.map((m) => {
                  const year = m >= 4 ? sessionYear : sessionYear + 1
                  const payment = salaryPayments.find(
                    (sp) => sp.month === m && sp.year === year
                  )
                  const isPaid = !!payment

                  return (
                    <div
                      key={m}
                      className="flex items-center justify-between rounded-lg border px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isPaid ? 'bg-green-500' : 'bg-orange-400'
                          }`}
                        />
                        <span className="font-medium text-sm">
                          {MONTH_NAMES[m]} {year}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {isPaid ? formatINR(payment.amount) : `Expected: ${formatINR(totalYearlyEarning / SESSION_MONTHS.length)}`}
                        </span>
                        <Badge
                          variant={isPaid ? 'default' : 'outline'}
                          className={
                            isPaid
                              ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-200'
                              : 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200'
                          }
                        >
                          {isPaid ? 'Paid' : 'Expected'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salary Slip</DialogTitle>
              <DialogDescription>Payment receipt details</DialogDescription>
            </DialogHeader>
            {selectedSlip && (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="text-center border-b pb-3">
                    <h3 className="font-bold text-lg">Sankalp Vidya Academy</h3>
                    <p className="text-sm text-muted-foreground">Salary Slip</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Teacher Name:</span>
                    </div>
                    <div className="font-medium">{teacher.name}</div>
                    <div>
                      <span className="text-muted-foreground">Month:</span>
                    </div>
                    <div className="font-medium">
                      {MONTH_NAMES[selectedSlip.month]} {selectedSlip.year}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount:</span>
                    </div>
                    <div className="font-medium text-green-600 dark:text-green-400">
                      {formatINR(selectedSlip.amount)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Mode:</span>
                    </div>
                    <div className="font-medium">{selectedSlip.paymentMode}</div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                    </div>
                    <div className="font-medium">
                      {new Date(selectedSlip.paidAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
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
                    // Calculate paid and remaining
                    const paidTotal = student.feePayments.reduce((sum, fp) => sum + fp.amountPaid, 0)
                    const remaining = student.totalYearlyFee - paidTotal

                    return (
                      <div
                        key={student.id}
                        className="rounded-lg border px-4 py-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{student.name}</span>
                          <Badge
                            variant={remaining <= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {remaining <= 0 ? 'Clear' : `${formatINR(remaining)} due`}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Total: {formatINR(student.totalYearlyFee)}</span>
                          <span className="text-green-600 dark:text-green-400">Paid: {formatINR(paidTotal)}</span>
                          <span className={remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                            Remaining: {formatINR(remaining)}
                          </span>
                        </div>
                        {/* Subject-wise fees */}
                        {student.subjectFees.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {student.subjectFees.map((sf) => (
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
