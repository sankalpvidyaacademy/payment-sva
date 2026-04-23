'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  User,
  BookOpen,
  Calculator,
  Lock,
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Wand2,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/lib/store'
import {
  CLASS_OPTIONS,
  SUBJECTS_BY_CLASS,
  MONTH_NAMES,
  SESSION_MONTHS,
  MONTH_SHORT,
} from '@/lib/types'
import type { StudentData } from '@/lib/types'
import { toast } from 'sonner'

function getSessionYear() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  return month >= 1 && month <= 3 ? year - 1 : year
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Get the calendar year for a given session month */
function getCalendarYear(month: number, sessionYear: number): number {
  return month >= 4 && month <= 12 ? sessionYear : sessionYear + 1
}

interface SubjectFeeEntry {
  subject: string
  yearlyFee: number
}

interface MonthlyFeeEntry {
  month: number
  year: number
  amount: number
}

interface StudentFormProps {
  studentId?: string
  onSubmitted?: () => void
}

const STEPS = [
  { id: 1, title: 'Basic Details', icon: User },
  { id: 2, title: 'Subjects & Fees', icon: BookOpen },
  { id: 3, title: 'Fee Summary', icon: Calculator },
  { id: 4, title: 'Credentials', icon: Lock },
]

export function StudentForm({ studentId, onSubmitted }: StudentFormProps) {
  const { setAdminView, triggerRefresh } = useAppStore()
  const isEditing = !!studentId

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Basic Details
  const [name, setName] = useState('')
  const [className, setClassName] = useState('')
  const [dob, setDob] = useState('')

  // Step 2: Subjects & Fees
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectFees, setSubjectFees] = useState<SubjectFeeEntry[]>([])
  const [coachingFee, setCoachingFee] = useState(0)
  const [monthlyFeeDistributions, setMonthlyFeeDistributions] = useState<
    MonthlyFeeEntry[]
  >([])
  const [distributionsTouched, setDistributionsTouched] = useState(false)

  // Step 4: Credentials
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // State
  const [submitting, setSubmitting] = useState(false)
  const [loadingStudent, setLoadingStudent] = useState(false)

  // Computed
  const availableSubjects = className
    ? SUBJECTS_BY_CLASS[className] || []
    : []
  const isAllSubjectsClass = className
    ? ['4', '5', '6', '7', '8'].includes(className)
    : false
  const subjectFeeTotal = subjectFees.reduce(
    (sum, sf) => sum + sf.yearlyFee,
    0
  )
  const totalYearlyFee = subjectFeeTotal + coachingFee
  const progressValue = (currentStep / 4) * 100
  const sessionYear = getSessionYear()

  // Computed: total of monthly distributions
  const totalMonthlyDistributed = useMemo(
    () => monthlyFeeDistributions.reduce((sum, m) => sum + m.amount, 0),
    [monthlyFeeDistributions]
  )

  // Computed: difference between distributed and total yearly fee
  const distributionDifference =
    Math.round(totalMonthlyDistributed) - Math.round(totalYearlyFee)

  // Build the 12 session-month entries (used by auto-fill & initialisation)
  const buildDistributions = useCallback(
    (amounts: number[]): MonthlyFeeEntry[] => {
      return SESSION_MONTHS.map((month, index) => ({
        month,
        year: getCalendarYear(month, sessionYear),
        amount: amounts[index] || 0,
      }))
    },
    [sessionYear]
  )

  // Auto-fill evenly
  const handleAutoFillEvenly = useCallback(() => {
    if (totalYearlyFee <= 0) return
    const evenAmount = Math.floor(totalYearlyFee / 12)
    const remainder = Math.round(totalYearlyFee - evenAmount * 12)
    const amounts = SESSION_MONTHS.map((_, i) =>
      i < remainder ? evenAmount + 1 : evenAmount
    )
    setMonthlyFeeDistributions(buildDistributions(amounts))
    setDistributionsTouched(true)
  }, [totalYearlyFee, buildDistributions])

  // Auto-fill with coaching fee: base = subject fees / 12, coaching fee added to April
  const handleAutoFillWithCoaching = useCallback(() => {
    if (totalYearlyFee <= 0 || coachingFee <= 0) return
    const basePerMonth = Math.floor(subjectFeeTotal / 12)
    const subjectRemainder = Math.round(subjectFeeTotal - basePerMonth * 12)
    const amounts = SESSION_MONTHS.map((month, i) => {
      let amount = i < subjectRemainder ? basePerMonth + 1 : basePerMonth
      if (month === 4) {
        amount += coachingFee // Coaching fee allocated to April
      }
      return amount
    })
    setMonthlyFeeDistributions(buildDistributions(amounts))
    setDistributionsTouched(true)
  }, [totalYearlyFee, coachingFee, subjectFeeTotal, buildDistributions])

  // Auto-select subjects when class changes
  useEffect(() => {
    if (!className) {
      setSelectedSubjects([])
      setSubjectFees([])
      return
    }

    const subjects = SUBJECTS_BY_CLASS[className] || []
    if (['4', '5', '6', '7', '8'].includes(className)) {
      setSelectedSubjects(subjects)
      setSubjectFees(subjects.map((s) => ({ subject: s, yearlyFee: 0 })))
    } else {
      setSelectedSubjects([])
      setSubjectFees([])
    }
    setDistributionsTouched(false)
  }, [className])

  // When totalYearlyFee changes and distributions have not been manually edited,
  // auto-fill evenly so the user has a sensible starting point.
  useEffect(() => {
    if (totalYearlyFee > 0 && !distributionsTouched) {
      const evenAmount = Math.floor(totalYearlyFee / 12)
      const remainder = Math.round(totalYearlyFee - evenAmount * 12)
      const amounts = SESSION_MONTHS.map((_, i) =>
        i < remainder ? evenAmount + 1 : evenAmount
      )
      setMonthlyFeeDistributions(buildDistributions(amounts))
    }
  }, [totalYearlyFee, distributionsTouched, buildDistributions])

  // Update a single month's amount
  const updateMonthAmount = (month: number, amount: number) => {
    setMonthlyFeeDistributions((prev) =>
      prev.map((m) => (m.month === month ? { ...m, amount } : m))
    )
    setDistributionsTouched(true)
  }

  // Toggle subject selection
  const toggleSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) => {
      const isSelected = prev.includes(subject)
      const newSelected = isSelected
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]

      setSubjectFees((prevFees) => {
        if (isSelected) {
          return prevFees.filter((sf) => sf.subject !== subject)
        } else {
          return [...prevFees, { subject, yearlyFee: 0 }]
        }
      })

      return newSelected
    })
  }, [])

  // Update a subject's yearly fee
  const updateSubjectFee = (subject: string, fee: number) => {
    setSubjectFees((prev) =>
      prev.map((sf) => (sf.subject === subject ? { ...sf, yearlyFee: fee } : sf))
    )
  }

  // Load student data for editing
  useEffect(() => {
    if (!studentId) return

    async function loadStudent() {
      setLoadingStudent(true)
      try {
        const res = await fetch(`/api/students/${studentId}`)
        if (!res.ok) throw new Error('Failed to load student')
        const student: StudentData = await res.json()

        setName(student.name)
        setClassName(student.className)
        setUsername(student.user.username)

        // Set DOB
        if (student.dob) {
          const date = new Date(student.dob)
          const yyyy = date.getFullYear()
          const mm = String(date.getMonth() + 1).padStart(2, '0')
          const dd = String(date.getDate()).padStart(2, '0')
          setDob(`${yyyy}-${mm}-${dd}`)
        }

        // Set subjects and fees from subjectFees
        if (student.subjectFees && student.subjectFees.length > 0) {
          const subs = student.subjectFees.map((sf) => sf.subject)
          setSelectedSubjects(subs)
          setSubjectFees(
            student.subjectFees.map((sf) => ({
              subject: sf.subject,
              yearlyFee: sf.yearlyFee,
            }))
          )
        } else {
          setSelectedSubjects(student.subjects)
          setSubjectFees(
            student.subjects.map((s) => ({ subject: s, yearlyFee: 0 }))
          )
        }

        setCoachingFee(student.coachingFee)

        // Load monthly fee distributions
        if (
          student.monthlyFeeDistributions &&
          student.monthlyFeeDistributions.length > 0
        ) {
          const distributions = SESSION_MONTHS.map((month) => {
            const year = getCalendarYear(month, sessionYear)
            const existing = student.monthlyFeeDistributions.find(
              (m) => m.month === month && m.year === year
            )
            return {
              month,
              year,
              amount: existing?.amount || 0,
            }
          })
          setMonthlyFeeDistributions(distributions)
        } else {
          // Fallback: distribute based on monthlyFee
          const monthlyAmount = student.monthlyFee || 0
          const distributions = SESSION_MONTHS.map((month) => ({
            month,
            year: getCalendarYear(month, sessionYear),
            amount: monthlyAmount,
          }))
          setMonthlyFeeDistributions(distributions)
        }
        setDistributionsTouched(true)
      } catch {
        toast.error('Failed to load student data')
      } finally {
        setLoadingStudent(false)
      }
    }

    loadStudent()
  }, [studentId, sessionYear])

  // Validation for each step
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!name.trim()) return 'Student name is required'
        if (!className) return 'Please select a class'
        if (!dob) return 'Date of birth is required'
        return null
      case 2:
        if (selectedSubjects.length === 0)
          return 'Please select at least one subject'
        if (isAllSubjectsClass && subjectFeeTotal <= 0)
          return 'Please enter the yearly fee for All Subjects'
        if (
          !isAllSubjectsClass &&
          subjectFees.some((sf) => sf.yearlyFee <= 0)
        )
          return 'Please enter yearly fee for all selected subjects'
        if (coachingFee <= 0)
          return 'Coaching fee is required and must be greater than ₹0'
        return null
      case 3:
        return null // Summary step, no validation needed
      case 4:
        if (!username.trim()) return 'Username is required'
        if (!isEditing && !password) return 'Password is required'
        if (password && password.length < 4)
          return 'Password must be at least 4 characters'
        if (password && password !== confirmPassword)
          return 'Passwords do not match'
        return null
      default:
        return null
    }
  }

  const handleNext = () => {
    const error = validateStep(currentStep)
    if (error) {
      toast.error(error)
      return
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    const error = validateStep(4)
    if (error) {
      toast.error(error)
      return
    }

    setSubmitting(true)
    try {
      // Calculate average monthly fee for backward compat
      const avgMonthlyFee =
        totalYearlyFee > 0 ? Math.round(totalYearlyFee / 12) : 0

      const payload = {
        ...(isEditing ? { id: studentId } : {}),
        name: name.trim(),
        className,
        dob: dob ? new Date(dob).toISOString() : null,
        subjects: selectedSubjects,
        totalYearlyFee,
        coachingFee,
        monthlyFee: avgMonthlyFee,
        subjectFees: subjectFees.map((sf) => ({
          subject: sf.subject,
          yearlyFee: sf.yearlyFee,
        })),
        monthlyFeeDistributions: monthlyFeeDistributions.map((m) => ({
          month: m.month,
          year: m.year,
          amount: m.amount,
        })),
        username: username.trim(),
        ...(password ? { password } : {}),
      }

      const res = await fetch('/api/students', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save student')
      }

      toast.success(
        isEditing
          ? 'Student updated successfully!'
          : 'Student registered successfully!'
      )
      triggerRefresh()

      if (onSubmitted) {
        onSubmitted()
      } else {
        resetForm()
        setAdminView('students')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Something went wrong'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setName('')
    setClassName('')
    setDob('')
    setSelectedSubjects([])
    setSubjectFees([])
    setCoachingFee(0)
    setMonthlyFeeDistributions([])
    setDistributionsTouched(false)
    setUsername('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  if (loadingStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
        <span className="ml-3 text-muted-foreground">
          Loading student data...
        </span>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {isEditing ? 'Edit Student' : 'Register New Student'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isEditing
            ? 'Update student information'
            : 'Add a new student to the academy'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <Progress value={progressValue} className="h-2" />
        <div className="flex justify-between mt-3">
          {STEPS.map((step) => {
            const StepIcon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id
            return (
              <div
                key={step.id}
                className={`flex items-center gap-1.5 text-xs ${
                  isActive
                    ? 'text-[#2F2FE4] font-semibold'
                    : isCompleted
                      ? 'text-emerald-600'
                      : 'text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Card */}
      <Card className="rounded-xl shadow-md border-0">
        <CardHeader>
          <CardTitle className="text-lg">
            {STEPS[currentStep - 1].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="studentName">Student Name *</Label>
                <Input
                  id="studentName"
                  placeholder="Enter student's full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Date of Birth *
                  </span>
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="rounded-lg"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="classSelect">Class *</Label>
                <Select value={className} onValueChange={setClassName}>
                  <SelectTrigger className="w-full rounded-lg">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_OPTIONS.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        Class {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {className && availableSubjects.length > 0 && (
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                    Available Subjects
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubjects.map((sub) => (
                      <Badge
                        key={sub}
                        variant="secondary"
                        className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                      >
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Subjects & Fees */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Subject Selection */}
              <div className="space-y-3">
                <Label>Select Subjects *</Label>

                {isAllSubjectsClass ? (
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <Checkbox
                      id="all-subjects"
                      checked={selectedSubjects.includes('All Subjects')}
                      onCheckedChange={() => toggleSubject('All Subjects')}
                    />
                    <Label
                      htmlFor="all-subjects"
                      className="cursor-pointer font-medium text-emerald-700 dark:text-emerald-400"
                    >
                      All Subjects
                    </Label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          selectedSubjects.includes(subject)
                            ? 'bg-[#2F2FE4]/5 border-[#2F2FE4]/30 dark:bg-[#2F2FE4]/10'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => toggleSubject(subject)}
                      >
                        <Checkbox
                          id={`subject-${subject}`}
                          checked={selectedSubjects.includes(subject)}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <Label
                          htmlFor={`subject-${subject}`}
                          className="cursor-pointer text-sm"
                        >
                          {subject}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subject Fee Inputs */}
              {subjectFees.length > 0 && (
                <div className="space-y-3">
                  <Label>Yearly Fee per Subject</Label>
                  <div className="space-y-3">
                    {subjectFees.map((sf) => (
                      <div
                        key={sf.subject}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-sm font-medium min-w-[120px]">
                          {sf.subject}
                        </span>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            ₹
                          </span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={sf.yearlyFee || ''}
                            onChange={(e) =>
                              updateSubjectFee(
                                sf.subject,
                                Number(e.target.value) || 0
                              )
                            }
                            className="pl-7 rounded-lg"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Coaching Fee - now mandatory */}
              <div className="space-y-2">
                <Label htmlFor="coachingFee">Coaching Fee *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ₹
                  </span>
                  <Input
                    id="coachingFee"
                    type="number"
                    min={1}
                    placeholder="Enter coaching fee"
                    value={coachingFee || ''}
                    onChange={(e) =>
                      setCoachingFee(Number(e.target.value) || 0)
                    }
                    className="pl-7 rounded-lg"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Coaching fee is added to subject fees for total yearly fee
                  calculation.
                </p>
              </div>

              {/* Total Yearly Fee */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Total Yearly Fee
                </span>
                <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(totalYearlyFee)}
                </span>
              </div>

              <Separator />

              {/* Monthly Fee Distribution */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Monthly Fee Distribution
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Session {sessionYear}-{sessionYear + 1}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the fee amount for each session month. Total should match
                  the yearly fee of {formatCurrency(totalYearlyFee)}.
                </p>

                {/* Auto-fill Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFillEvenly}
                    className="rounded-lg text-xs"
                    disabled={totalYearlyFee <= 0}
                  >
                    <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                    Auto-fill Evenly
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoFillWithCoaching}
                    className="rounded-lg text-xs"
                    disabled={totalYearlyFee <= 0 || coachingFee <= 0}
                  >
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    Auto-fill with Coaching Fee
                  </Button>
                </div>

                {/* Warning if mismatch */}
                {totalYearlyFee > 0 && distributionDifference !== 0 && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      Math.abs(distributionDifference) > 100
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        Math.abs(distributionDifference) > 100
                          ? 'text-red-500'
                          : 'text-amber-500'
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        Math.abs(distributionDifference) > 100
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      ⚠️ Total monthly fees ({formatCurrency(totalMonthlyDistributed)}) don&apos;t match total yearly fee ({formatCurrency(totalYearlyFee)}). Difference: {formatCurrency(Math.abs(distributionDifference))}
                    </p>
                  </div>
                )}

                {/* Month-by-month inputs */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
                  {monthlyFeeDistributions.map((entry) => (
                    <div
                      key={`${entry.month}-${entry.year}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="min-w-[90px]">
                        <span className="text-sm font-medium">
                          {MONTH_SHORT[entry.month]}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          {entry.year}
                        </span>
                      </div>
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={entry.amount || ''}
                          onChange={(e) =>
                            updateMonthAmount(
                              entry.month,
                              Number(e.target.value) || 0
                            )
                          }
                          className="pl-7 rounded-lg h-9 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Distribution Total */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">
                    Distribution Total
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      totalYearlyFee > 0 && distributionDifference !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatCurrency(totalMonthlyDistributed)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Fee Structure Summary */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Student Info */}
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Student Name
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Date of Birth
                  </span>
                  <span className="text-sm font-medium">
                    {dob
                      ? new Date(dob).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Class</span>
                  <span className="text-sm font-medium">
                    Class {className}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subjects
                  </span>
                  <span className="text-sm font-medium text-right max-w-[200px]">
                    {selectedSubjects.join(', ')}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Fee Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Fee Breakdown
                </h4>
                {subjectFees.map((sf) => (
                  <div
                    key={sf.subject}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-muted-foreground">
                      {sf.subject}
                    </span>
                    <span className="text-sm font-medium">
                      {formatCurrency(sf.yearlyFee)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">
                    Coaching Fee
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(coachingFee)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Total Yearly Fee
                  </span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(totalYearlyFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-muted-foreground">
                    Avg. Monthly Fee
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(
                      totalYearlyFee > 0
                        ? Math.round(totalYearlyFee / 12)
                        : 0
                    )}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Monthly Fee Distribution Summary */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Monthly Fee Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {monthlyFeeDistributions.map((entry) => (
                    <div
                      key={`${entry.month}-${entry.year}`}
                      className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {MONTH_SHORT[entry.month]} {entry.year}
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {formatCurrency(entry.amount)}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Distribution total */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">
                    Total Distributed
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      distributionDifference !== 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {formatCurrency(totalMonthlyDistributed)}
                  </span>
                </div>
                {distributionDifference !== 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      ⚠️ Total monthly fees ({formatCurrency(totalMonthlyDistributed)}) don&apos;t match total yearly fee ({formatCurrency(totalYearlyFee)}). Difference: {formatCurrency(Math.abs(distributionDifference))}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Session Info */}
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  Session Information
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Academic Session: April {sessionYear} - March{' '}
                  {sessionYear + 1}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Monthly fees are due for each of the 12 session months (Apr to
                  Mar).
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {SESSION_MONTHS.map((m) => (
                    <Badge
                      key={m}
                      variant="outline"
                      className="text-[10px] border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                    >
                      {MONTH_SHORT[m]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Login Credentials */}
          {currentStep === 4 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  The student will use these credentials to log in and view
                  their fee status.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {isEditing
                    ? 'New Password (leave blank to keep current)'
                    : 'Password *'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={
                      isEditing
                        ? 'Leave blank to keep current'
                        : 'Create a password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-lg pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm the password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="rounded-lg pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password &&
                  confirmPassword &&
                  password !== confirmPassword && (
                    <p className="text-xs text-red-500">
                      Passwords do not match
                    </p>
                  )}
                {password &&
                  confirmPassword &&
                  password === confirmPassword && (
                    <p className="text-xs text-emerald-600">
                      Passwords match ✓
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <div className="flex items-center gap-1">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`h-2 rounded-full transition-all ${
                    step.id === currentStep
                      ? 'w-6 bg-[#2F2FE4]'
                      : step.id < currentStep
                        ? 'w-2 bg-emerald-500'
                        : 'w-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
              >
                {submitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Update Student' : 'Register Student'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
