import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

    // Find the student
    const student = await db.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Find or create FeePayment for this student/month/year
    const existingPayment = await db.feePayment.findFirst({
      where: {
        studentId,
        month: parseInt(String(month)),
        year: parseInt(String(year)),
      },
    });

    const slipNumber = 'SLP-' + Date.now();
    const monthlyFee = student.monthlyFee;

    let feePayment;

    if (existingPayment) {
      // Update existing payment - add to amountPaid
      const newAmountPaid = existingPayment.amountPaid + parseFloat(String(amountPaid));
      feePayment = await db.feePayment.update({
        where: { id: existingPayment.id },
        data: {
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
          month: parseInt(String(month)),
          year: parseInt(String(year)),
          amountDue: monthlyFee,
          amountPaid: parseFloat(String(amountPaid)),
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

    return NextResponse.json(feePayment, { status: 201 });
  } catch (error) {
    console.error('Collect fee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
