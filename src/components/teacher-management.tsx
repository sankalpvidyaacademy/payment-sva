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
import { TeacherForm } from '@/components/teacher-form'
import { CLASS_OPTIONS } from '@/lib/types'
import type { TeacherData } from '@/lib/types'
import { useAppStore } from '@/lib/store'

export function TeacherManagement() {
  const { refreshKey } = useAppStore()
  const [teachers, setTeachers] = useState<TeacherData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTeacher, setDeletingTeacher] = useState<TeacherData | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedClass && selectedClass !== 'all') {
        params.set('className', selectedClass)
      }
      const res = await fetch(`/api/teachers?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch teachers')
      const data = await res.json()
      setTeachers(data)
    } catch {
      toast.error('Failed to load teachers')
    } finally {
      setLoading(false)
    }
  }, [selectedClass])

  useEffect(() => {
    if (!showForm) {
      fetchTeachers()
    }
  }, [fetchTeachers, showForm, refreshKey])

  const handleDelete = async () => {
    if (!deletingTeacher) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teachers/${deletingTeacher.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete teacher')
      toast.success('Teacher deleted successfully')
      fetchTeachers()
    } catch {
      toast.error('Failed to delete teacher')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
      setDeletingTeacher(null)
    }
  }

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // If form is shown, render the form
  if (showForm) {
    return (
      <TeacherForm
        onSubmitted={() => {
          setShowForm(false)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Teacher Management</h2>
          <p className="text-muted-foreground">Register, edit, and manage teachers</p>
        </div>
        <Button
          className="bg-[#2F2FE4] hover:bg-[#2525c0]"
          onClick={() => {
            setShowForm(true)
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Teacher
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{teachers.length}</p>
            <p className="text-xs text-muted-foreground">Total Teachers</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {new Set(teachers.flatMap((t) => t.classes)).size}
            </p>
            <p className="text-xs text-muted-foreground">Classes Covered</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">
              {new Set(teachers.flatMap((t) => t.subjects)).size}
            </p>
            <p className="text-xs text-muted-foreground">Subjects Taught</p>
          </CardContent>
        </Card>
      </div>

      {/* Teacher List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
        </div>
      ) : filteredTeachers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No teachers found</p>
            <p className="text-sm">Add a teacher or change the filter</p>
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
                      <TableHead>Classes</TableHead>
                      <TableHead>Subjects</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{teacher.user.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {teacher.classes.map((cls) => (
                              <Badge key={cls} variant="outline" className="text-xs">Class {cls}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {teacher.subjects.slice(0, 3).map((sub) => (
                              <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                            ))}
                            {teacher.subjects.length > 3 && (
                              <Badge variant="secondary" className="text-xs">+{teacher.subjects.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                toast.info('Edit functionality coming soon')
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setDeletingTeacher(teacher)
                                setDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
            {filteredTeachers.map((teacher) => (
              <Card key={teacher.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">@{teacher.user.username}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Classes</p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.classes.map((cls) => (
                          <Badge key={cls} variant="outline" className="text-xs">Class {cls}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Subjects</p>
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.map((sub) => (
                          <Badge key={sub} variant="secondary" className="text-xs">{sub}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        toast.info('Edit functionality coming soon')
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
                        setDeletingTeacher(teacher)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deletingTeacher?.name}</span>?
              This action cannot be undone. All salary records will also be deleted.
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
