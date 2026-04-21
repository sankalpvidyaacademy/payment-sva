'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { MONTH_NAMES, SESSION_MONTHS, MONTH_SHORT } from '@/lib/types'
import type { MonthlyReport, YearlyReport } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, BarChart3, Calendar } from 'lucide-react'

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

export default function Reports() {
  const { refreshKey } = useAppStore()
  const [activeTab, setActiveTab] = useState<string>('monthly')

  // Monthly report state
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [monthlyData, setMonthlyData] = useState<MonthlyReport | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(true)

  // Yearly report state
  const [selectedSessionYear, setSelectedSessionYear] = useState<number>(getSessionYear())
  const [yearlyData, setYearlyData] = useState<YearlyReport | null>(null)
  const [yearlyLoading, setYearlyLoading] = useState(true)

  // Fetch monthly report
  useEffect(() => {
    let active = true
    fetch(`/api/reports?type=monthly&month=${selectedMonth}&year=${selectedYear}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setMonthlyData(data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setMonthlyLoading(false)
      })
    return () => { active = false }
  }, [selectedMonth, selectedYear, refreshKey])

  // Fetch yearly report
  useEffect(() => {
    let active = true
    fetch(`/api/reports?type=yearly&year=${selectedSessionYear}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setYearlyData(data)
      })
      .catch(() => {})
      .finally(() => {
        if (active) setYearlyLoading(false)
      })
    return () => { active = false }
  }, [selectedSessionYear, refreshKey])

  // Generate year options
  const sessionYear = getSessionYear()
  const yearOptions = [sessionYear, sessionYear - 1, sessionYear - 2, sessionYear + 1]

  // Simple bar chart data for monthly
  const monthlyChartMax = monthlyData
    ? Math.max(
        monthlyData.totalFeesReceived,
        monthlyData.totalExpenses,
        monthlyData.totalSalaryPaid,
        1
      )
    : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-brand" />
        <h2 className="text-2xl font-bold">Profit & Loss Reports</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="monthly" className="flex-1 sm:flex-none gap-1.5">
            <Calendar className="h-4 w-4" />
            Monthly Report
          </TabsTrigger>
          <TabsTrigger value="yearly" className="flex-1 sm:flex-none gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Yearly Report
          </TabsTrigger>
        </TabsList>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-6 mt-4">
          {/* Month/Year Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(selectedMonth)} onValueChange={(v) => { setSelectedMonth(Number(v)); setMonthlyLoading(true) }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {SESSION_MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {MONTH_NAMES[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(selectedYear)} onValueChange={(v) => { setSelectedYear(Number(v)); setMonthlyLoading(true) }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {monthlyLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : monthlyData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      Total Income
                    </CardDescription>
                    <CardTitle className="text-xl text-green-600 dark:text-green-400">
                      {formatINR(monthlyData.totalFeesReceived)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {monthlyData.feePaymentCount} payment(s) received
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" />
                      Expenses
                    </CardDescription>
                    <CardTitle className="text-xl text-orange-600 dark:text-orange-400">
                      {formatINR(monthlyData.totalExpenses)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {monthlyData.expenseCount} expense(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      Salary Paid
                    </CardDescription>
                    <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
                      {formatINR(monthlyData.totalSalaryPaid)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {monthlyData.salaryPaymentCount} salary payment(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      {monthlyData.profitLoss >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      Profit / Loss
                    </CardDescription>
                    <CardTitle
                      className={`text-xl ${
                        monthlyData.profitLoss >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatINR(monthlyData.profitLoss)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={monthlyData.profitLoss >= 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {monthlyData.profitLoss >= 0 ? 'PROFIT' : 'LOSS'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Simple Bar Visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {MONTH_NAMES[selectedMonth]} {selectedYear} - Visual Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Income bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fees Received</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatINR(monthlyData.totalFeesReceived)}
                      </span>
                    </div>
                    <div className="h-8 rounded-md bg-muted overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(
                            (monthlyData.totalFeesReceived / monthlyChartMax) * 100,
                            monthlyData.totalFeesReceived > 0 ? 8 : 0
                          )}%`,
                        }}
                      >
                        {monthlyData.totalFeesReceived > 0 && (
                          <span className="text-xs text-white font-medium">
                            {formatINR(monthlyData.totalFeesReceived)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expenses bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expenses</span>
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {formatINR(monthlyData.totalExpenses)}
                      </span>
                    </div>
                    <div className="h-8 rounded-md bg-muted overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(
                            (monthlyData.totalExpenses / monthlyChartMax) * 100,
                            monthlyData.totalExpenses > 0 ? 8 : 0
                          )}%`,
                        }}
                      >
                        {monthlyData.totalExpenses > 0 && (
                          <span className="text-xs text-white font-medium">
                            {formatINR(monthlyData.totalExpenses)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Salary bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Salary Paid</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {formatINR(monthlyData.totalSalaryPaid)}
                      </span>
                    </div>
                    <div className="h-8 rounded-md bg-muted overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(
                            (monthlyData.totalSalaryPaid / monthlyChartMax) * 100,
                            monthlyData.totalSalaryPaid > 0 ? 8 : 0
                          )}%`,
                        }}
                      >
                        {monthlyData.totalSalaryPaid > 0 && (
                          <span className="text-xs text-white font-medium">
                            {formatINR(monthlyData.totalSalaryPaid)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Net P/L bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Net Profit/Loss</span>
                      <span
                        className={`font-medium ${
                          monthlyData.profitLoss >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatINR(monthlyData.profitLoss)}
                      </span>
                    </div>
                    <div className="h-8 rounded-md bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2 ${
                          monthlyData.profitLoss >= 0 ? 'bg-green-700' : 'bg-red-600'
                        }`}
                        style={{
                          width: `${Math.max(
                            (Math.abs(monthlyData.profitLoss) / monthlyChartMax) * 100,
                            monthlyData.profitLoss !== 0 ? 8 : 0
                          )}%`,
                        }}
                      >
                        {monthlyData.profitLoss !== 0 && (
                          <span className="text-xs text-white font-medium">
                            {formatINR(monthlyData.profitLoss)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No data available for the selected period.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Yearly Report */}
        <TabsContent value="yearly" className="space-y-6 mt-4">
          {/* Session Year Selector */}
          <div className="flex items-center gap-3">
            <Select
              value={String(selectedSessionYear)}
              onValueChange={(v) => { setSelectedSessionYear(Number(v)); setYearlyLoading(true) }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Session" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Session {y}-{(y + 1) % 100}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {yearlyLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : yearlyData ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      Total Income
                    </CardDescription>
                    <CardTitle className="text-xl text-green-600 dark:text-green-400">
                      {formatINR(yearlyData.totalFeesReceived)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Session {yearlyData.sessionLabel}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" />
                      Total Expenses
                    </CardDescription>
                    <CardTitle className="text-xl text-orange-600 dark:text-orange-400">
                      {formatINR(yearlyData.totalExpenses)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Session {yearlyData.sessionLabel}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4" />
                      Total Salary
                    </CardDescription>
                    <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
                      {formatINR(yearlyData.totalSalaryPaid)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Session {yearlyData.sessionLabel}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5">
                      {yearlyData.profitLoss >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      Net Profit / Loss
                    </CardDescription>
                    <CardTitle
                      className={`text-xl ${
                        yearlyData.profitLoss >= 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatINR(yearlyData.profitLoss)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      variant={yearlyData.profitLoss >= 0 ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {yearlyData.profitLoss >= 0 ? 'PROFIT' : 'LOSS'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Breakdown Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Monthly Breakdown - Session {yearlyData.sessionLabel}
                  </CardTitle>
                  <CardDescription>April {selectedSessionYear} to March {selectedSessionYear + 1}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto custom-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Fees Received</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                          <TableHead className="text-right">Salary</TableHead>
                          <TableHead className="text-right">Profit/Loss</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {yearlyData.monthlyBreakdown.map((row) => (
                          <TableRow key={`${row.month}-${row.year}`}>
                            <TableCell className="font-medium">
                              {MONTH_SHORT[row.month]} {row.year}
                            </TableCell>
                            <TableCell className="text-right text-green-600 dark:text-green-400">
                              {formatINR(row.fees)}
                            </TableCell>
                            <TableCell className="text-right text-orange-600 dark:text-orange-400">
                              {formatINR(row.expenses)}
                            </TableCell>
                            <TableCell className="text-right text-blue-600 dark:text-blue-400">
                              {formatINR(row.salary)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-medium ${
                                row.profitLoss >= 0
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}
                            >
                              {formatINR(row.profitLoss)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>Total</TableCell>
                          <TableCell className="text-right text-green-600 dark:text-green-400">
                            {formatINR(yearlyData.totalFeesReceived)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 dark:text-orange-400">
                            {formatINR(yearlyData.totalExpenses)}
                          </TableCell>
                          <TableCell className="text-right text-blue-600 dark:text-blue-400">
                            {formatINR(yearlyData.totalSalaryPaid)}
                          </TableCell>
                          <TableCell
                            className={`text-right ${
                              yearlyData.profitLoss >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {formatINR(yearlyData.profitLoss)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No data available for the selected session.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
