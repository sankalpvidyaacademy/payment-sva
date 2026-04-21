'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  GraduationCap,
  BookOpen,
  IndianRupee,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { StudentForm } from '@/components/student-form'
import { CLASS_OPTIONS } from '@/lib/types'
import type { StudentData } from '@/lib/types'
import { useAppStore } from '@/lib/store'

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function StudentManagement() {
  const { refreshKey } = useAppStore()
  const [students, setStudents] = useState<StudentData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState<StudentData | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    if (!showForm) {
      fetchStudents()
    }
  }, [fetchStudents, showForm, refreshKey])

  const handleDelete = async () => {
    if (!deletingStudent) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/students/${deletingStudent.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete student')
      toast.success('Student deleted successfully')
      fetchStudents()
    } catch {
      toast.error('Failed to delete student')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingStudent(null)
    }
  }

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If form is shown, render the form
  if (showForm) {
    return (
      <StudentForm
        studentId={editingStudentId || undefined}
        onSubmitted={() => {
          setShowForm(false)
          setEditingStudentId(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Management</h2>
          <p className="text-muted-foreground">Register, edit, and manage students</p>
        </div>
        <Button
          className="bg-[#2F2FE4] hover:bg-[#2525c0]"
          onClick={() => {
            setEditingStudentId(null)
            setShowForm(true)
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48">
            <GraduationCap className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Filter by Class" />
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{students.length}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold">
              {formatINR(students.reduce((sum, s) => sum + s.totalYearlyFee, 0))}
            </p>
            <p className="text-xs text-muted-foreground">Total Fees</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold">
              {formatINR(students.reduce((sum, s) => sum + s.feePayments.reduce((a, p) => a + p.amountPaid, 0), 0))}
            </p>
            <p className="text-xs text-muted-foreground">Fees Collected</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-red-600 mx-auto mb-1" />
            <p className="text-lg font-bold">
              {formatINR(students.reduce((sum, s) => sum + Math.max(0, s.totalYearlyFee - s.feePayments.reduce((a, p) => a + p.amountPaid, 0)), 0))}
            </p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No students found</p>
            <p className="text-sm">Add a student or change the filter</p>
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
                      <TableHead>Username</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead>Total Fee</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const paid = student.feePayments.reduce((sum, p) => sum + p.amountPaid, 0)
                      const remaining = Math.max(0, student.totalYearlyFee - paid)
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{student.user.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.className}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {student.subjects.slice(0, 3).map((sub) => (
                                <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                              ))}
                              {student.subjects.length > 3 && (
                                <Badge variant="secondary" className="text-xs">+{student.subjects.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatINR(student.totalYearlyFee)}</TableCell>
                          <TableCell className="text-green-600 font-medium">{formatINR(paid)}</TableCell>
                          <TableCell className={remaining > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {formatINR(remaining)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingStudentId(student.id)
                                  setShowForm(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeletingStudent(student)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
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
              const paid = student.feePayments.reduce((sum, p) => sum + p.amountPaid, 0)
              const remaining = Math.max(0, student.totalYearlyFee - paid)
              return (
                <Card key={student.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">@{student.user.username}</p>
                      </div>
                      <Badge variant="outline">Class {student.className}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {student.subjects.map((sub) => (
                        <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                      ))}
                    </div>
                    <Separator className="my-3" />
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatINR(student.totalYearlyFee)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold text-green-600">{formatINR(paid)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Remaining</p>
                        <p className={`font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatINR(remaining)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEditingStudentId(student.id)
                          setShowForm(true)
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingStudent(student)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingStudent?.name}</span>?
              This action cannot be undone. All fee records will also be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
