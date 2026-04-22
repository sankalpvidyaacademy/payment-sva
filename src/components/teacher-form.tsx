'use client'

import { useState, useMemo } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { CLASS_OPTIONS, SUBJECTS_BY_CLASS } from '@/lib/types'
import { toast } from 'sonner'

interface TeacherFormProps {
  onSubmitted?: () => void
}

export function TeacherForm({ onSubmitted }: TeacherFormProps) {
  const { setAdminView, triggerRefresh } = useAppStore()

  // Form state
  const [name, setName] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dynamically compute available subjects based on selected classes
  const availableSubjects = useMemo(() => {
    if (selectedClasses.length === 0) return []

    const subjectSet = new Set<string>()
    selectedClasses.forEach((cls) => {
      const subjects = SUBJECTS_BY_CLASS[cls] || []
      subjects.forEach((s) => subjectSet.add(s))
    })

    return Array.from(subjectSet).sort()
  }, [selectedClasses])

  // Toggle class selection
  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) => {
      const newSelected = prev.includes(cls)
        ? prev.filter((c) => c !== cls)
        : [...prev, cls]

      // Remove subjects that are no longer available
      if (newSelected.length === 0) {
        setSelectedSubjects([])
      } else {
        const availableSubjectsSet = new Set<string>()
        newSelected.forEach((c) => {
          const subjects = SUBJECTS_BY_CLASS[c] || []
          subjects.forEach((s) => availableSubjectsSet.add(s))
        })
        setSelectedSubjects((prevSubjects) =>
          prevSubjects.filter((s) => availableSubjectsSet.has(s))
        )
      }

      return newSelected
    })
  }

  // Toggle subject selection
  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject)
        ? prev.filter((s) => s !== subject)
        : [...prev, subject]
    )
  }

  // Select all subjects
  const selectAllSubjects = () => {
    setSelectedSubjects(availableSubjects)
  }

  // Deselect all subjects
  const deselectAllSubjects = () => {
    setSelectedSubjects([])
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Teacher name is required')
      return
    }
    if (selectedClasses.length === 0) {
      toast.error('Please select at least one class')
      return
    }
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject')
      return
    }
    if (!username.trim()) {
      toast.error('Username is required')
      return
    }
    if (!password) {
      toast.error('Password is required')
      return
    }
    if (password.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        classes: selectedClasses,
        subjects: selectedSubjects,
        username: username.trim(),
        password,
      }

      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register teacher')
      }

      toast.success('Teacher registered successfully!')
      triggerRefresh()
      resetForm()

      if (onSubmitted) {
        onSubmitted()
      } else {
        setAdminView('teachers')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setName('')
    setSelectedClasses([])
    setSelectedSubjects([])
    setUsername('')
    setPassword('')
    setShowPassword(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Register New Teacher</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a new teacher to the academy
        </p>
      </div>

      <Card className="rounded-xl shadow-md border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-[#2F2FE4]" />
            Teacher Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Teacher Name */}
            <div className="space-y-2">
              <Label htmlFor="teacherName">Teacher Name *</Label>
              <Input
                id="teacherName"
                placeholder="Enter teacher's full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-lg"
              />
            </div>

            <Separator />

            {/* Classes They Teach */}
            <div className="space-y-3">
              <Label>Classes They Teach *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CLASS_OPTIONS.map((cls) => {
                  const isSelected = selectedClasses.includes(cls)
                  return (
                    <div
                      key={cls}
                      className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#2F2FE4]/5 border-[#2F2FE4]/30'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleClass(cls)}
                    >
                      <Checkbox
                        id={`class-${cls}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleClass(cls)}
                      />
                      <Label
                        htmlFor={`class-${cls}`}
                        className="cursor-pointer text-sm"
                      >
                        Class {cls}
                      </Label>
                    </div>
                  )
                })}
              </div>
              {selectedClasses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground">Selected:</span>
                  {selectedClasses.map((cls) => (
                    <Badge key={cls} className="bg-[#2F2FE4] text-white text-xs">
                      Class {cls}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Subjects They Teach */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subjects They Teach *</Label>
                {availableSubjects.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllSubjects}
                      className="text-xs text-[#2F2FE4] h-7 px-2"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllSubjects}
                      className="text-xs text-muted-foreground h-7 px-2"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>

              {availableSubjects.length === 0 ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Select at least one class to see available subjects
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSubjects.map((subject) => {
                    const isSelected = selectedSubjects.includes(subject)
                    return (
                      <div
                        key={subject}
                        className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleSubject(subject)}
                      >
                        <Checkbox
                          id={`subject-${subject}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSubject(subject)}
                        />
                        <Label
                          htmlFor={`subject-${subject}`}
                          className="cursor-pointer text-sm"
                        >
                          {subject}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-muted-foreground">Selected:</span>
                  {selectedSubjects.map((sub) => (
                    <Badge key={sub} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                      {sub}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Login Credentials */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Login Credentials</h4>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-700">
                  The teacher will use these credentials to log in and view their salary details.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherUsername">Username *</Label>
                <Input
                  id="teacherUsername"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherPassword">Password *</Label>
                <div className="relative">
                  <Input
                    id="teacherPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
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
            </div>

            <Separator />

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={resetForm}
                className="rounded-lg"
              >
                Reset
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Teacher'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
