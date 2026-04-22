'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  IndianRupee,
  Receipt,
  TrendingUp,
  TrendingDown,
  UserPlus,
  GraduationCap,
  Wallet,
  Banknote,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { MONTH_SHORT } from '@/lib/types'
import type { YearlyReport, FeePayment, StudentData } from '@/lib/types'
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

interface DashboardData {
  studentCount: number
  yearlyReport: YearlyReport | null
  recentPayments: FeePayment[]
  pendingFeeStudents: number
}

export function AdminDashboard() {
  const { setAdminView } = useAppStore()
  const [data, setData] = useState<DashboardData>({
    studentCount: 0,
    yearlyReport: null,
    recentPayments: [],
    pendingFeeStudents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const sessionYear = getSessionYear()

        const [studentsRes, reportRes, feesRes, pendingRes] = await Promise.allSettled([
          fetch('/api/students'),
          fetch(`/api/reports?type=yearly&year=${sessionYear}`),
          fetch('/api/fees'),
          fetch(`/api/reports?type=pending-fees&year=${sessionYear}`),
        ])

        let studentCount = 0
        let yearlyReport: YearlyReport | null = null
        let recentPayments: FeePayment[] = []
        let pendingFeeStudents = 0

        if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
          const students: StudentData[] = await studentsRes.value.json()
          studentCount = students.length
        } else {
          toast.error('Failed to load student data')
        }

        if (reportRes.status === 'fulfilled' && reportRes.value.ok) {
          yearlyReport = await reportRes.value.json()
        } else {
          toast.error('Failed to load financial report')
        }

        if (feesRes.status === 'fulfilled' && feesRes.value.ok) {
          const allPayments: FeePayment[] = await feesRes.value.json()
          // Get only the last 5 recent payments that have been paid
          recentPayments = allPayments
            .filter((p) => p.paidAt !== null)
            .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())
            .slice(0, 5)
        } else {
          toast.error('Failed to load recent transactions')
        }

        if (pendingRes.status === 'fulfilled' && pendingRes.value.ok) {
          const pendingData = await pendingRes.value.json()
          if (pendingData.students) {
            pendingFeeStudents = pendingData.students.filter(
              (s: { monthlyData: Record<string, { status: string }> }) =>
                Object.values(s.monthlyData).some((m) => m.status === 'unpaid' || m.status === 'partial')
            ).length
          }
        }

        setData({ studentCount, yearlyReport, recentPayments, pendingFeeStudents })
      } catch {
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const totalFees = data.yearlyReport?.totalFeesReceived ?? 0
  const totalExpenses = (data.yearlyReport?.totalExpenses ?? 0) + (data.yearlyReport?.totalSalaryPaid ?? 0)
  const profitLoss = data.yearlyReport?.profitLoss ?? 0
  const isProfit = profitLoss >= 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Session {getSessionYear()}-{(getSessionYear() + 1) % 100} Overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <Card className="rounded-xl shadow-md border-0 overflow-hidden">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Total Students</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{data.studentCount}</p>
                </div>
                <div className="rounded-lg bg-blue-100 p-2.5">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Fees Received */}
        <Card className="rounded-xl shadow-md border-0 overflow-hidden">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Fees Received</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalFees)}</p>
                </div>
                <div className="rounded-lg bg-emerald-100 p-2.5">
                  <IndianRupee className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="rounded-xl shadow-md border-0 overflow-hidden">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Total Expenses</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="rounded-lg bg-orange-100 p-2.5">
                  <Receipt className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit/Loss */}
        <Card className="rounded-xl shadow-md border-0 overflow-hidden">
          <CardContent className="p-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: isProfit ? '#16a34a' : '#dc2626' }}>
                    {isProfit ? 'Profit' : 'Loss'}
                  </p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {isProfit ? '+' : '-'}{formatCurrency(Math.abs(profitLoss))}
                  </p>
                </div>
                <div className={`rounded-lg p-2.5 ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
                  {isProfit ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="rounded-xl shadow-md border-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button
              onClick={() => setAdminView('students')}
              className="h-auto flex-col gap-2 py-4 bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
            >
              <UserPlus className="h-5 w-5" />
              <span className="text-xs font-medium">Add Student</span>
            </Button>
            <Button
              onClick={() => setAdminView('teachers')}
              className="h-auto flex-col gap-2 py-4 bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
            >
              <GraduationCap className="h-5 w-5" />
              <span className="text-xs font-medium">Add Teacher</span>
            </Button>
            <Button
              onClick={() => setAdminView('fees')}
              className="h-auto flex-col gap-2 py-4 bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
            >
              <Wallet className="h-5 w-5" />
              <span className="text-xs font-medium">Collect Fees</span>
            </Button>
            <Button
              onClick={() => setAdminView('salary')}
              className="h-auto flex-col gap-2 py-4 bg-[#2F2FE4] hover:bg-[#2525c0] rounded-lg"
            >
              <Banknote className="h-5 w-5" />
              <span className="text-xs font-medium">Pay Salary</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Recent Transactions + Pending Fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 rounded-xl shadow-md border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdminView('fees')}
                className="text-[#2F2FE4] hover:text-[#2525c0]"
              >
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : data.recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {data.recentPayments.map((payment, idx) => (
                  <div key={payment.id}>
                    <div className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
                          <IndianRupee className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {(payment as FeePayment & { student?: { name?: string; className?: string } }).student?.name || 'Student'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {MONTH_SHORT[payment.month]} {payment.year} &middot; Class {(payment as FeePayment & { student?: { name?: string; className?: string } }).student?.className || '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-600">
                          +{formatCurrency(payment.amountPaid)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </p>
                      </div>
                    </div>
                    {idx < data.recentPayments.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Fees Alert */}
        <Card className="rounded-xl shadow-md border-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Fees</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdminView('pending-fees')}
                className="text-[#2F2FE4] hover:text-[#2525c0]"
              >
                View <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-xl p-4 ${data.pendingFeeStudents > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${data.pendingFeeStudents > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {data.pendingFeeStudents > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${data.pendingFeeStudents > 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {data.pendingFeeStudents}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Students with unpaid fees
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full p-2 bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-700">{data.studentCount}</p>
                      <p className="text-xs text-muted-foreground">Total enrolled</p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full border-[#2F2FE4] text-[#2F2FE4] hover:bg-[#2F2FE4] hover:text-white rounded-lg"
                  onClick={() => setAdminView('pending-fees')}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  View Pending Fees Report
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
