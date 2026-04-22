'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { CLASS_OPTIONS, SUBJECTS_BY_CLASS, MONTH_NAMES, SESSION_MONTHS } from '@/lib/types'
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

interface SubjectFeeEntry {
  subject: string
  yearlyFee: number
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

  // Step 2: Subjects & Fees
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectFees, setSubjectFees] = useState<SubjectFeeEntry[]>([])
  const [coachingFee, setCoachingFee] = useState(0)
  const [monthlyFee, setMonthlyFee] = useState(0)
  const [monthlyFeeEdited, setMonthlyFeeEdited] = useState(false)

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
  const availableSubjects = className ? SUBJECTS_BY_CLASS[className] || [] : []
  const isAllSubjectsClass = className ? ['4', '5', '6', '7', '8'].includes(className) : false
  const totalYearlyFee = subjectFees.reduce((sum, sf) => sum + sf.yearlyFee, 0)
  const progressValue = (currentStep / 4) * 100

  // Auto-select subjects when class changes
  useEffect(() => {
    if (!className) {
      setSelectedSubjects([])
      setSubjectFees([])
      return
    }

    const subjects = SUBJECTS_BY_CLASS[className] || []
    if (['4', '5', '6', '7', '8'].includes(className)) {
      // Auto-select "All Subjects" for classes 4-8
      setSelectedSubjects(subjects)
      setSubjectFees(subjects.map((s) => ({ subject: s, yearlyFee: 0 })))
    } else {
      // For classes 9+, don't auto-select
      setSelectedSubjects([])
      setSubjectFees([])
    }
    setMonthlyFeeEdited(false)
  }, [className])

  // Auto-calculate monthly fee
  useEffect(() => {
    if (!monthlyFeeEdited && totalYearlyFee > 0) {
      setMonthlyFee(Math.round(totalYearlyFee / 12))
    }
  }, [totalYearlyFee, monthlyFeeEdited])

  // Handle monthly fee manual edit
  const handleMonthlyFeeChange = (value: string) => {
    setMonthlyFee(Number(value) || 0)
    setMonthlyFeeEdited(true)
  }

  // Toggle subject selection
  const toggleSubject = useCallback((subject: string) => {
    setSelectedSubjects((prev) => {
      const isSelected = prev.includes(subject)
      const newSelected = isSelected
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]

      // Update subjectFees
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
        setMonthlyFee(student.monthlyFee)
        setMonthlyFeeEdited(true)
      } catch {
        toast.error('Failed to load student data')
      } finally {
        setLoadingStudent(false)
      }
    }

    loadStudent()
  }, [studentId])

  // Validation for each step
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 1:
        if (!name.trim()) return 'Student name is required'
        if (!className) return 'Please select a class'
        return null
      case 2:
        if (selectedSubjects.length === 0) return 'Please select at least one subject'
        if (isAllSubjectsClass && totalYearlyFee <= 0)
          return 'Please enter the yearly fee for All Subjects'
        if (!isAllSubjectsClass && subjectFees.some((sf) => sf.yearlyFee <= 0))
          return 'Please enter yearly fee for all selected subjects'
        return null
      case 3:
        return null // Summary step, no validation needed
      case 4:
        if (!username.trim()) return 'Username is required'
        if (!isEditing && !password) return 'Password is required'
        if (password && password.length < 4) return 'Password must be at least 4 characters'
        if (password && password !== confirmPassword) return 'Passwords do not match'
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
      const payload = {
        ...(isEditing ? { id: studentId } : {}),
        name: name.trim(),
        className,
        subjects: selectedSubjects,
        totalYearlyFee,
        coachingFee,
        monthlyFee,
        subjectFees: subjectFees.map((sf) => ({
          subject: sf.subject,
          yearlyFee: sf.yearlyFee,
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

      toast.success(isEditing ? 'Student updated successfully!' : 'Student registered successfully!')
      triggerRefresh()

      if (onSubmitted) {
        onSubmitted()
      } else {
        // Reset and navigate
        resetForm()
        setAdminView('students')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setName('')
    setClassName('')
    setSelectedSubjects([])
    setSubjectFees([])
    setCoachingFee(0)
    setMonthlyFee(0)
    setMonthlyFeeEdited(false)
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
        <span className="ml-3 text-muted-foreground">Loading student data...</span>
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
          {isEditing ? 'Update student information' : 'Add a new student to the academy'}
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
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Available Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableSubjects.map((sub) => (
                      <Badge key={sub} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
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
              <div className="space-y-3">
                <Label>Select Subjects *</Label>

                {isAllSubjectsClass ? (
                  // Single "All Subjects" checkbox for classes 4-8
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <Checkbox
                      id="all-subjects"
                      checked={selectedSubjects.includes('All Subjects')}
                      onCheckedChange={() => toggleSubject('All Subjects')}
                    />
                    <Label htmlFor="all-subjects" className="cursor-pointer font-medium text-emerald-700">
                      All Subjects
                    </Label>
                  </div>
                ) : (
                  // Multiple subject checkboxes for classes 9+
                  <div className="grid grid-cols-2 gap-2">
                    {availableSubjects.map((subject) => (
                      <div
                        key={subject}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          selectedSubjects.includes(subject)
                            ? 'bg-[#2F2FE4]/5 border-[#2F2FE4]/30'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
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
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
                      >
                        <span className="text-sm font-medium min-w-[120px]">{sf.subject}</span>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={sf.yearlyFee || ''}
                            onChange={(e) =>
                              updateSubjectFee(sf.subject, Number(e.target.value) || 0)
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

              {/* Total and Monthly Fee */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="text-sm font-medium text-emerald-700">Total Yearly Fee</span>
                  <span className="text-lg font-bold text-emerald-700">
                    {formatCurrency(totalYearlyFee)}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coachingFee">Coaching Fee (Optional)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      id="coachingFee"
                      type="number"
                      min={0}
                      placeholder="0"
                      value={coachingFee || ''}
                      onChange={(e) => setCoachingFee(Number(e.target.value) || 0)}
                      className="pl-7 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyFee">Monthly Fee</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <Input
                      id="monthlyFee"
                      type="number"
                      min={0}
                      placeholder="Auto-calculated from yearly fee"
                      value={monthlyFee || ''}
                      onChange={(e) => handleMonthlyFeeChange(e.target.value)}
                      className="pl-7 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated as Yearly Fee ÷ 12. You can override this value.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Fee Structure Summary */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Student Name</span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Class</span>
                  <span className="text-sm font-medium">{className}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subjects</span>
                  <span className="text-sm font-medium">{selectedSubjects.join(', ')}</span>
                </div>
              </div>

              <Separator />

              {/* Fee Breakdown */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Fee Breakdown</h4>
                {subjectFees.map((sf) => (
                  <div key={sf.subject} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">{sf.subject}</span>
                    <span className="text-sm font-medium">{formatCurrency(sf.yearlyFee)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-medium text-emerald-700">Total Yearly Fee</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(totalYearlyFee)}</span>
                </div>
                {coachingFee > 0 && (
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-muted-foreground">Coaching Fee</span>
                    <span className="text-sm font-medium">{formatCurrency(coachingFee)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-sm font-medium text-[#2F2FE4]">Monthly Fee</span>
                  <span className="text-sm font-bold text-[#2F2FE4]">{formatCurrency(monthlyFee)}</span>
                </div>
              </div>

              <Separator />

              {/* Session Info */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-blue-700">Session Information</h4>
                <p className="text-xs text-blue-600">
                  Academic Session: April {getSessionYear()} - March {getSessionYear() + 1}
                </p>
                <p className="text-xs text-blue-600">
                  Monthly fees are due for each of the 12 session months (Apr to Mar).
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {SESSION_MONTHS.map((m) => (
                    <Badge
                      key={m}
                      variant="outline"
                      className="text-[10px] border-blue-300 text-blue-600"
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
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">
                  The student will use these credentials to log in and view their fee status.
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
                  {isEditing ? 'New Password (leave blank to keep current)' : 'Password *'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEditing ? 'Leave blank to keep current' : 'Create a password'}
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {password && confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-emerald-600">Passwords match ✓</p>
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
                      : 'w-2 bg-gray-200'
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
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update Student' : 'Register Student'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
