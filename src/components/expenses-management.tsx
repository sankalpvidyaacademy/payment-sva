'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Loader2,
  IndianRupee,
  CalendarDays,
  Receipt,
  AlertTriangle,
  Wallet,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MONTH_NAMES, SESSION_MONTHS } from '@/lib/types'
import type { ExpenseData } from '@/lib/types'

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

function getCurrentMonth(): number {
  return new Date().getMonth() + 1
}

function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function ExpensesManagement() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(String(getCurrentMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(getCurrentYear()))

  // Add expense form
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expensePurpose, setExpensePurpose] = useState('')
  const [adding, setAdding] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('month', selectedMonth)
      params.set('year', selectedYear)
      const res = await fetch(`/api/expenses?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch expenses')
      const data = await res.json()
      setExpenses(data)
    } catch {
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  async function handleAddExpense() {
    const amount = parseFloat(expenseAmount)
    const purpose = expensePurpose.trim()
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!purpose) {
      toast.error('Please enter a purpose')
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          amount,
          purpose,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to add expense')
      }
      toast.success('Expense added successfully!')
      setExpenseAmount('')
      setExpensePurpose('')
      fetchExpenses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add expense')
    } finally {
      setAdding(false)
    }
  }

  function handleDeleteClick(id: string) {
    setDeleteId(id)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete expense')
      }
      toast.success('Expense deleted successfully')
      fetchExpenses()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete expense')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
      setDeleteId(null)
    }
  }

  const currentYear = getCurrentYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Expenses Management</h2>
        <p className="text-muted-foreground">Track and manage academy expenses</p>
      </div>

      {/* Month/Year Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label className="mb-1.5 block text-sm font-medium">Month</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full">
              <CalendarDays className="h-4 w-4 mr-1" />
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
        <div className="flex-1">
          <Label className="mb-1.5 block text-sm font-medium">Year</Label>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Monthly Summary Card */}
      <Card className="border-[#2F2FE4]/20">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-[#2F2FE4]/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-[#2F2FE4]" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {MONTH_NAMES[parseInt(selectedMonth)]} {selectedYear} Summary
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#2F2FE4]">
                {formatINR(totalExpenses)}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{expenses.length}</strong> expense
              {expenses.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-[#2F2FE4]" />
            Add Expense for {MONTH_NAMES[parseInt(selectedMonth)]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm font-medium">Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="pl-9"
                  min="1"
                />
              </div>
            </div>
            <div className="flex-[2]">
              <Label className="mb-1.5 block text-sm font-medium">Purpose</Label>
              <Input
                placeholder="E.g., Rent, Electricity, Stationery"
                value={expensePurpose}
                onChange={(e) => setExpensePurpose(e.target.value)}
              />
            </div>
            <Button
              className="bg-[#2F2FE4] hover:bg-[#2525c0] h-9 sm:h-9"
              onClick={handleAddExpense}
              disabled={adding || !expenseAmount || !expensePurpose.trim()}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F2FE4]" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No expenses recorded for {MONTH_NAMES[parseInt(selectedMonth)]} {selectedYear}</p>
            <p className="text-sm mt-1">Add your first expense above</p>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {new Date(expense.createdAt).toLocaleDateString('en-IN')}
                        </TableCell>
                        <TableCell className="font-medium">
                          {expense.purpose}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatINR(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{expense.purpose}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(expense.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className="font-bold text-red-600 whitespace-nowrap">
                        {formatINR(expense.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => handleDeleteClick(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Expense
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
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
