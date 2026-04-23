'use client'

import { useState } from 'react'
import {
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  Plus,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { CLASS_OPTIONS, SUBJECTS_BY_CLASS } from '@/lib/types'
import { toast } from 'sonner'

// Each class-subject combination row
interface ClassSubjectEntry {
  id: string          // unique key for React
  className: string   // selected class
  subjects: string[]  // selected subjects for this class
}

interface TeacherFormProps {
  onSubmitted?: () => void
}

let entryIdCounter = 0
function nextEntryId() {
  return `entry-${++entryIdCounter}`
}

export function TeacherForm({ onSubmitted }: TeacherFormProps) {
  const { setAdminView, triggerRefresh } = useAppStore()

  // Form state
  const [name, setName] = useState('')
  const [classSubjects, setClassSubjects] = useState<ClassSubjectEntry[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Add a new class-subject row
  const addEntry = () => {
    setClassSubjects((prev) => [
      ...prev,
      { id: nextEntryId(), className: '', subjects: [] },
    ])
  }

  // Remove a class-subject row
  const removeEntry = (entryId: string) => {
    setClassSubjects((prev) => prev.filter((e) => e.id !== entryId))
  }

  // Update class for a specific row
  const updateClass = (entryId: string, className: string) => {
    setClassSubjects((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        // When class changes, filter subjects to only those available in the new class
        const newClassSubjects = SUBJECTS_BY_CLASS[className] || []
        const filteredSubjects = e.subjects.filter((s) =>
          newClassSubjects.includes(s)
        )
        return { ...e, className, subjects: filteredSubjects }
      })
    )
  }

  // Toggle a subject for a specific row
  const toggleSubject = (entryId: string, subject: string) => {
    setClassSubjects((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        const newSubjects = e.subjects.includes(subject)
          ? e.subjects.filter((s) => s !== subject)
          : [...e.subjects, subject]
        return { ...e, subjects: newSubjects }
      })
    )
  }

  // Select all subjects for a specific row
  const selectAllSubjects = (entryId: string) => {
    setClassSubjects((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        return { ...e, subjects: [...(SUBJECTS_BY_CLASS[e.className] || [])] }
      })
    )
  }

  // Clear all subjects for a specific row
  const clearSubjects = (entryId: string) => {
    setClassSubjects((prev) =>
      prev.map((e) => {
        if (e.id !== entryId) return e
        return { ...e, subjects: [] }
      })
    )
  }

  // Compute the merged lists for API submission
  const allClasses = [...new Set(classSubjects.map((e) => e.className).filter(Boolean))]
  const allSubjects = [...new Set(classSubjects.flatMap((e) => e.subjects))]

  // Check for duplicate class selection
  const hasDuplicateClass = classSubjects.some(
    (e) => e.className && classSubjects.filter((o) => o.className === e.className).length > 1
  )

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Teacher name is required')
      return
    }
    if (classSubjects.length === 0 || allClasses.length === 0) {
      toast.error('Please add at least one class-subject combination')
      return
    }
    if (hasDuplicateClass) {
      toast.error('Duplicate class selections found. Please combine subjects under one class entry.')
      return
    }
    const hasEmptySubjects = classSubjects.some((e) => e.className && e.subjects.length === 0)
    if (hasEmptySubjects) {
      toast.error('Please select at least one subject for each class')
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
        classes: allClasses,
        subjects: allSubjects,
        classSubjects: classSubjects.filter(e => e.className).map(e => ({ className: e.className, subjects: e.subjects })),
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
    setClassSubjects([])
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
          Add a new teacher with class-subject mapping
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

            {/* Class-Subject Mapping */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Class & Subject Mapping *</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select a class, then choose subjects taught in that class
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addEntry}
                  className="text-[#2F2FE4] border-[#2F2FE4]/30 hover:bg-[#2F2FE4]/5"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Class
                </Button>
              </div>

              {classSubjects.length === 0 ? (
                <div className="rounded-lg bg-gray-50 border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    No classes added yet. Click &quot;Add Class&quot; to start mapping.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEntry}
                    className="text-[#2F2FE4]"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Class
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {classSubjects.map((entry) => {
                    const availableSubjects = entry.className
                      ? SUBJECTS_BY_CLASS[entry.className] || []
                      : []

                    return (
                      <Card key={entry.id} className="border border-gray-200 rounded-lg">
                        <CardContent className="p-4">
                          {/* Class Selection */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-3">
                              <div>
                                <Label className="mb-1.5 block text-sm font-medium">Select Class</Label>
                                <Select
                                  value={entry.className}
                                  onValueChange={(val) => updateClass(entry.id, val)}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a class..." />
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

                              {/* Subjects for this class */}
                              {entry.className && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">
                                      Subjects for Class {entry.className}
                                    </Label>
                                    {availableSubjects.length > 0 && (
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => selectAllSubjects(entry.id)}
                                          className="text-xs text-[#2F2FE4] h-7 px-2"
                                        >
                                          Select All
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => clearSubjects(entry.id)}
                                          className="text-xs text-muted-foreground h-7 px-2"
                                        >
                                          Clear
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {availableSubjects.map((subject) => {
                                      const isSelected = entry.subjects.includes(subject)
                                      return (
                                        <div
                                          key={subject}
                                          className={`flex items-center space-x-2 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                                            isSelected
                                              ? 'bg-emerald-50 border-emerald-300'
                                              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                          }`}
                                          onClick={() => toggleSubject(entry.id, subject)}
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSubject(entry.id, subject)}
                                          />
                                          <Label className="cursor-pointer text-sm">
                                            {subject}
                                          </Label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {entry.subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      <span className="text-xs text-muted-foreground">Selected:</span>
                                      {entry.subjects.map((sub) => (
                                        <Badge
                                          key={sub}
                                          variant="secondary"
                                          className="text-xs bg-emerald-100 text-emerald-700"
                                        >
                                          {sub}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Remove button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 mt-6"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Summary of all selections */}
              {allClasses.length > 0 && (
                <div className="rounded-lg bg-[#2F2FE4]/5 border border-[#2F2FE4]/20 p-3">
                  <p className="text-sm font-medium text-foreground mb-2">Summary</p>
                  {classSubjects.filter(e => e.className && e.subjects.length > 0).map((entry) => (
                    <div key={entry.id} className="mb-2 last:mb-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge className="bg-[#2F2FE4] text-white text-xs">
                          Class {entry.className}
                        </Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 ml-2">
                        {entry.subjects.map((sub) => (
                          <Badge key={sub} variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasDuplicateClass && (
                <p className="text-xs text-red-500">
                  ⚠ Duplicate class detected. Combine subjects under one class entry.
                </p>
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
