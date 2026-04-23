'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { CLASS_OPTIONS, MONTH_SHORT, SESSION_MONTHS, MONTH_NAMES } from '@/lib/types'
import type { PendingFeesReport } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'

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

// Color coding: Simplified to Green (Paid) and Red (Unpaid)
function getStatusCellClass(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-500/20 text-green-700 dark:text-green-400'
    case 'unpaid':
      return 'bg-red-500/20 text-red-700 dark:text-red-400'
    case 'partial':
      return 'bg-red-500/15 text-red-600 dark:text-red-400' // Treat partial as unpaid (red)
    case 'advance':
      return 'bg-green-500/25 text-green-800 dark:text-green-300' // Treat advance as paid (green)
    default:
      return 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

// Small status indicator dot class
function getStatusDotClass(status: string): string {
  switch (status) {
    case 'paid':
    case 'advance':
      return 'bg-green-500'
    case 'unpaid':
    case 'partial':
      return 'bg-red-500'
    default:
      return 'bg-gray-300'
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Paid'
    case 'unpaid':
      return 'Unpaid'
    case 'partial':
      return 'Partial'
    case 'advance':
      return 'Advance'
    default:
      return 'No Fee'
  }
}

// Format payment date as "12 May" or "12 May 2026"
function formatPaymentDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const day = d.getDate()
  const monthShort = MONTH_SHORT[d.getMonth() + 1]
  return `${day} ${monthShort}`
}

export default function PendingFees() {
  const { refreshKey } = useAppStore()
  const [data, setData] = useState<PendingFeesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState<string>('all')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  const sessionYear = getSessionYear()

  useEffect(() => {
    let active = true
    fetch(`/api/reports?type=pending-fees&year=${sessionYear}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        if (active && result) setData(result)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [sessionYear, refreshKey])

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredStudents = data
    ? classFilter === 'all'
      ? data.students
      : data.students.filter((s) => s.className === classFilter)
    : []

  // Get unique classes from data
  const classOptions = data
    ? [...new Set(data.students.map((s) => s.className))].sort()
    : []

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Pending Fees</h2>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Pending Fees</h2>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            <p>Unable to load pending fees data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-brand" />
          <h2 className="text-2xl font-bold">Pending Fees</h2>
          <Badge variant="secondary" className="ml-2">
            Session {data.sessionLabel}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  Class {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 print:hidden">
            <Printer className="h-4 w-4" />
            PDF / Print
          </Button>
        </div>
      </div>

      {/* Color Legend - Simplified to Green/Red */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500/40" />
          <span className="text-muted-foreground">Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/40" />
          <span className="text-muted-foreground">Unpaid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <span className="text-muted-foreground">No Fee</span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block print:block">
        <Card className="print:shadow-none print:border-0">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Class</TableHead>
                    <TableHead className="sticky left-[100px] bg-background z-10 min-w-[140px]">Student Name</TableHead>
                    <TableHead className="text-right min-w-[90px]">Total Fees</TableHead>
                    {SESSION_MONTHS.map((m) => (
                      <TableHead key={m} className="text-center min-w-[90px]">
                        {MONTH_SHORT[m]}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[90px]">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                        No students found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      // Calculate total remaining
                      let totalPaid = 0
                      let totalDue = 0
                      SESSION_MONTHS.forEach((m) => {
                        const key = `${m}-${m >= 4 ? sessionYear : sessionYear + 1}`
                        const md = student.monthlyData[key]
                        if (md) {
                          totalPaid += md.amountPaid
                          totalDue += md.amountDue
                        }
                      })
                      const remaining = totalDue - totalPaid

                      return (
                        <TableRow key={student.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {student.className}
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background z-10 font-medium">
                            {student.name}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatINR(student.totalYearlyFee)}
                          </TableCell>
                          {SESSION_MONTHS.map((m) => {
                            const key = `${m}-${m >= 4 ? sessionYear : sessionYear + 1}`
                            const md = student.monthlyData[key]
                            if (!md) {
                              return (
                                <TableCell key={m} className="text-center">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    -
                                  </span>
                                </TableCell>
                              )
                            }
                            const isPaid = md.status === 'paid' || md.status === 'advance'
                            return (
                              <TableCell key={m} className="text-center">
                                <span
                                  className={`inline-block min-w-[60px] px-1.5 py-0.5 rounded text-xs font-medium ${getStatusCellClass(
                                    md.status
                                  )}`}
                                >
                                  <span>{formatINR(md.amountDue)}</span>
                                  {isPaid && md.paidAt && (
                                    <span className="block text-[10px] opacity-70 mt-0.5">
                                      {formatPaymentDate(md.paidAt)}
                                    </span>
                                  )}
                                </span>
                              </TableCell>
                            )
                          })}
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              remaining > 0
                                ? 'text-red-600 dark:text-red-400'
                                : remaining < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-green-600 dark:text-green-400'
                            }`}
                          >
                            {formatINR(remaining)}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden print:hidden space-y-3">
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No students found.
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student) => {
            // Calculate totals
            let totalPaid = 0
            let totalDue = 0
            SESSION_MONTHS.forEach((m) => {
              const key = `${m}-${m >= 4 ? sessionYear : sessionYear + 1}`
              const md = student.monthlyData[key]
              if (md) {
                totalPaid += md.amountPaid
                totalDue += md.amountDue
              }
            })
            const remaining = totalDue - totalPaid
            const isExpanded = expandedCards.has(student.id)

            return (
              <Card key={student.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => toggleCard(student.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{student.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Class {student.className} | Total: {formatINR(student.totalYearlyFee)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={remaining > 0 ? 'destructive' : 'default'}
                        className="text-xs"
                      >
                        {remaining > 0 ? `${formatINR(remaining)} due` : 'Clear'}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Monthly status dots (always visible) */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {SESSION_MONTHS.map((m) => {
                      const key = `${m}-${m >= 4 ? sessionYear : sessionYear + 1}`
                      const md = student.monthlyData[key]
                      const status = md?.status || 'none'
                      return (
                        <div
                          key={m}
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${getStatusDotClass(
                            status
                          )}`}
                          title={`${MONTH_SHORT[m]}: ${getStatusLabel(status)}`}
                        >
                          {MONTH_SHORT[m][0]}
                        </div>
                      )
                    })}
                  </div>
                </CardHeader>

                {/* Expanded detail */}
                {isExpanded && (
                  <CardContent className="pt-0 pb-3">
                    <div className="space-y-2">
                      {SESSION_MONTHS.map((m) => {
                        const key = `${m}-${m >= 4 ? sessionYear : sessionYear + 1}`
                        const md = student.monthlyData[key]
                        if (!md) return null
                        const isPaid = md.status === 'paid' || md.status === 'advance'
                        return (
                          <div
                            key={m}
                            className="flex items-center justify-between text-sm rounded-md px-3 py-1.5"
                          >
                            <span className="font-medium">{MONTH_SHORT[m]}</span>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${getStatusCellClass(
                                  md.status
                                )}`}
                              >
                                {isPaid ? 'Paid' : 'Unpaid'}
                              </span>
                              <span className="text-muted-foreground w-16 text-right">
                                {formatINR(md.amountDue)}
                              </span>
                              {isPaid && md.paidAt && (
                                <span className="text-[10px] text-muted-foreground">
                                  {formatPaymentDate(md.paidAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      <div className="flex items-center justify-between text-sm font-semibold pt-2 border-t">
                        <span>Remaining</span>
                        <span
                          className={
                            remaining > 0
                              ? 'text-red-600 dark:text-red-400'
                              : remaining < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-green-600 dark:text-green-400'
                          }
                        >
                          {formatINR(remaining)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Print-only summary */}
      <div className="hidden print:block print:mt-4">
        <p className="text-xs text-muted-foreground">
          Generated on {new Date().toLocaleDateString('en-IN')} | Session {data.sessionLabel} | Total Students: {filteredStudents.length}
        </p>
      </div>
    </div>
  )
}
