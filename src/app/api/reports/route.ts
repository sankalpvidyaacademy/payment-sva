import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Academic session months in order: April(4) through March(3)
const SESSION_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

// Get the session year for a given date
// If month is Jan-Mar (1-3), the session started in the previous year
function getSessionYear(month: number, year: number): number {
  if (month >= 1 && month <= 3) {
    return year - 1;
  }
  return year;
}

// Get all months in a session starting from April of sessionYear to March of sessionYear+1
function getSessionMonths(sessionYear: number): Array<{ month: number; year: number }> {
  return SESSION_MONTHS.map((m) => ({
    month: m,
    year: m >= 4 ? sessionYear : sessionYear + 1,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'monthly') {
      return await getMonthlyReport(searchParams);
    } else if (type === 'yearly') {
      return await getYearlyReport(searchParams);
    } else if (type === 'pending-fees') {
      return await getPendingFeesReport(searchParams);
    } else {
      return NextResponse.json(
        { error: 'Invalid report type. Use: monthly, yearly, or pending-fees' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getMonthlyReport(searchParams: URLSearchParams) {
  const month = parseInt(searchParams.get('month') || '0');
  const year = parseInt(searchParams.get('year') || '0');

  if (!month || !year) {
    return NextResponse.json(
      { error: 'month and year are required for monthly report' },
      { status: 400 }
    );
  }

  // Total fees received for this month
  const feePayments = await db.feePayment.findMany({
    where: { month, year },
  });
  const totalFeesReceived = feePayments.reduce(
    (sum, fp) => sum + fp.amountPaid,
    0
  );

  // Total expenses for this month
  const expenses = await db.expense.findMany({
    where: { month, year },
  });
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Total salary paid for this month
  const salaryPayments = await db.salaryPayment.findMany({
    where: { month, year },
  });
  const totalSalaryPaid = salaryPayments.reduce(
    (sum, sp) => sum + sp.amount,
    0
  );

  const profitLoss = totalFeesReceived - totalExpenses - totalSalaryPaid;

  return NextResponse.json({
    type: 'monthly',
    month,
    year,
    totalFeesReceived,
    totalExpenses,
    totalSalaryPaid,
    profitLoss,
    feePaymentCount: feePayments.length,
    expenseCount: expenses.length,
    salaryPaymentCount: salaryPayments.length,
  });
}

async function getYearlyReport(searchParams: URLSearchParams) {
  const year = parseInt(searchParams.get('year') || '0');

  if (!year) {
    return NextResponse.json(
      { error: 'year is required for yearly report' },
      { status: 400 }
    );
  }

  // Session: April(year) to March(year+1)
  const sessionMonths = getSessionMonths(year);

  // Aggregate data for all months in the session
  let totalFeesReceived = 0;
  let totalExpenses = 0;
  let totalSalaryPaid = 0;

  const monthlyBreakdown = [];

  for (const { month, year: y } of sessionMonths) {
    const feePayments = await db.feePayment.findMany({
      where: { month, year: y },
    });
    const monthFees = feePayments.reduce((sum, fp) => sum + fp.amountPaid, 0);

    const expenses = await db.expense.findMany({
      where: { month, year: y },
    });
    const monthExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const salaryPayments = await db.salaryPayment.findMany({
      where: { month, year: y },
    });
    const monthSalary = salaryPayments.reduce(
      (sum, sp) => sum + sp.amount,
      0
    );

    totalFeesReceived += monthFees;
    totalExpenses += monthExpenses;
    totalSalaryPaid += monthSalary;

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    monthlyBreakdown.push({
      month,
      year: y,
      monthName: monthNames[month],
      fees: monthFees,
      expenses: monthExpenses,
      salary: monthSalary,
      profitLoss: monthFees - monthExpenses - monthSalary,
    });
  }

  const profitLoss = totalFeesReceived - totalExpenses - totalSalaryPaid;

  return NextResponse.json({
    type: 'yearly',
    sessionYear: year,
    sessionLabel: `${year}-${(year + 1) % 100}`,
    totalFeesReceived,
    totalExpenses,
    totalSalaryPaid,
    profitLoss,
    monthlyBreakdown,
  });
}

async function getPendingFeesReport(searchParams: URLSearchParams) {
  const yearParam = searchParams.get('year');
  const now = new Date();
  const currentSessionYear = yearParam
    ? parseInt(yearParam)
    : getSessionYear(now.getMonth() + 1, now.getFullYear());

  const sessionMonths = getSessionMonths(currentSessionYear);

  // Get all students with their fee payments for the session
  const students = await db.student.findMany({
    include: {
      subjectFees: true,
      feePayments: {
        where: {
          OR: sessionMonths.map(({ month, year }) => ({
            month,
            year,
          })),
        },
      },
    },
    orderBy: { className: 'asc' },
  });

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const result = students.map((student) => {
    const monthlyData: Record<
      string,
      {
        month: number;
        year: number;
        amountDue: number;
        amountPaid: number;
        status: string;
        colorCode: string;
      }
    > = {};

    for (const { month, year } of sessionMonths) {
      const key = `${month}-${year}`;
      const payment = student.feePayments.find(
        (fp) => fp.month === month && fp.year === year
      );

      const amountDue = student.monthlyFee;
      const amountPaid = payment ? payment.amountPaid : 0;

      let status: string;
      let colorCode: string;

      if (amountPaid === 0) {
        status = 'unpaid';
        colorCode = 'red'; // Unpaid
      } else if (amountPaid >= amountDue && amountPaid > amountDue) {
        status = 'advance';
        colorCode = 'darkgreen'; // Paid more than due
      } else if (amountPaid >= amountDue) {
        status = 'paid';
        colorCode = 'green'; // Fully paid
      } else if (amountPaid > 0 && amountPaid < amountDue) {
        status = 'partial';
        colorCode = 'lightgreen'; // Partially paid
      } else {
        status = 'unpaid';
        colorCode = 'red';
      }

      monthlyData[key] = {
        month,
        year,
        amountDue,
        amountPaid,
        status,
        colorCode,
      };
    }

    return {
      id: student.id,
      name: student.name,
      className: student.className,
      subjects: JSON.parse(student.subjects),
      monthlyFee: student.monthlyFee,
      totalYearlyFee: student.totalYearlyFee,
      monthlyData,
    };
  });

  return NextResponse.json({
    type: 'pending-fees',
    sessionYear: currentSessionYear,
    sessionLabel: `${currentSessionYear}-${(currentSessionYear + 1) % 100}`,
    sessionMonths: sessionMonths.map(({ month, year }) => ({
      month,
      year,
      monthName: monthNames[month],
    })),
    students: result,
  });
}
