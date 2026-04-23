import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Academic session months in order: April(4) through March(3)
const SESSION_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

// Get the next month/year in the academic session
function getNextSessionMonth(month: number, year: number): { month: number; year: number } | null {
  const idx = SESSION_MONTHS.indexOf(month);
  if (idx === -1 || idx === SESSION_MONTHS.length - 1) return null;
  const nextMonth = SESSION_MONTHS[idx + 1];
  const actualYear = nextMonth >= 1 && nextMonth <= 3 && month >= 4
    ? year + 1
    : year;
  return { month: nextMonth, year: actualYear };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const feePayments = await db.feePayment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            className: true,
            monthlyFee: true,
            totalYearlyFee: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
    });

    return NextResponse.json(feePayments);
  } catch (error) {
    console.error('Get fees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate carry-forward from all previous session months
// Returns the cumulative adjustment (positive = student overpaid overall, negative = underpaid)
async function calculateCarryForward(
  studentId: string,
  upToMonth: number,
  upToYear: number,
  distributions: Array<{ month: number; year: number; amount: number }>,
  fallbackMonthlyFee: number
): Promise<number> {
  // Get all payments for this student in the current session
  const sessionYear = upToMonth >= 4 ? upToYear : upToYear - 1;
  const allPayments = await db.feePayment.findMany({
    where: { studentId },
  });

  let carryForward = 0;

  for (const m of SESSION_MONTHS) {
    const yr = m >= 4 ? sessionYear : sessionYear + 1;
    
    // Stop at the target month (don't include it)
    if (m === upToMonth && yr === upToYear) break;

    const payment = allPayments.find((p) => p.month === m && p.year === yr);
    
    if (payment && payment.paidAt) {
      // This month has been paid - calculate the difference
      const dist = distributions.find((d) => d.month === m && d.year === yr);
      const baseDue = dist ? dist.amount : fallbackMonthlyFee;
      const effectiveDue = baseDue + carryForward;
      carryForward += (payment.amountPaid - effectiveDue);
    }
    // If no payment or unpaid, carryForward stays the same
  }

  return carryForward;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, month, year, amountPaid, paymentMode } = body;

    if (!studentId || !month || !year || amountPaid === undefined) {
      return NextResponse.json(
        { error: 'studentId, month, year, and amountPaid are required' },
        { status: 400 }
      );
    }

    // Find the student with monthlyFeeDistributions
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        monthlyFeeDistributions: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const monthInt = parseInt(String(month));
    const yearInt = parseInt(String(year));
    const paymentAmount = parseFloat(String(amountPaid));

    // Look up MonthlyFeeDistribution for the specific month/year
    const distribution = student.monthlyFeeDistributions.find(
      (d) => d.month === monthInt && d.year === yearInt
    );
    const baseFee = distribution ? distribution.amount : student.monthlyFee;

    // Check for existing FeePayment for this month (could be from carry-forward)
    const existingPayment = await db.feePayment.findFirst({
      where: {
        studentId,
        month: monthInt,
        year: yearInt,
      },
    });

    const slipNumber = 'SLP-' + Date.now();

    // Calculate the effective amountDue for this month
    // If a FeePayment already exists (from carry-forward), use its adjusted amountDue
    // Otherwise, calculate carry-forward from previous session months dynamically
    let effectiveAmountDue = baseFee;

    if (existingPayment) {
      // Use the existing amountDue (may have been adjusted by carry-forward)
      effectiveAmountDue = existingPayment.amountDue;
    } else {
      // Calculate carry-forward from all previous months in this session
      const carryForward = await calculateCarryForward(studentId, monthInt, yearInt, student.monthlyFeeDistributions, student.monthlyFee);
      effectiveAmountDue = Math.max(0, baseFee + carryForward);
    }

    let feePayment;

    if (existingPayment) {
      // Update existing payment
      const newAmountPaid = existingPayment.amountPaid + paymentAmount;
      feePayment = await db.feePayment.update({
        where: { id: existingPayment.id },
        data: {
          amountDue: effectiveAmountDue,
          amountPaid: newAmountPaid,
          paymentMode: paymentMode || existingPayment.paymentMode,
          slipNumber,
          paidAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              className: true,
              monthlyFee: true,
              totalYearlyFee: true,
            },
          },
        },
      });
    } else {
      // Create new payment
      feePayment = await db.feePayment.create({
        data: {
          studentId,
          month: monthInt,
          year: yearInt,
          amountDue: effectiveAmountDue,
          amountPaid: paymentAmount,
          paymentMode: paymentMode || 'Offline',
          slipNumber,
          paidAt: new Date(),
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              className: true,
              monthlyFee: true,
              totalYearlyFee: true,
            },
          },
        },
      });
    }

    // ─────────────────────────────────────────────────────
    // PAYMENT ADJUSTMENT: Carry forward to next month
    // ─────────────────────────────────────────────────────
    const finalPaid = feePayment.amountPaid;
    const finalDue = feePayment.amountDue;
    const difference = finalPaid - finalDue; // positive = overpaid, negative = underpaid

    if (difference !== 0) {
      const nextMonthInfo = getNextSessionMonth(monthInt, yearInt);
      if (nextMonthInfo) {
        // Only adjust if a FeePayment already exists for the next month
        // Don't create phantom records
        const nextPayment = await db.feePayment.findFirst({
          where: {
            studentId,
            month: nextMonthInfo.month,
            year: nextMonthInfo.year,
          },
        });

        if (nextPayment && nextPayment.paidAt) {
          // Next month already paid - adjust its amountDue
          const adjustedDue = Math.max(0, nextPayment.amountDue + difference);
          await db.feePayment.update({
            where: { id: nextPayment.id },
            data: { amountDue: adjustedDue },
          });
        }
        // If no payment exists for next month, the carry-forward will be
        // calculated dynamically when the user pays for that month
      }
    }

    return NextResponse.json(feePayment, { status: 201 });
  } catch (error) {
    console.error('Collect fee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
