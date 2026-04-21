import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    const where: Record<string, unknown> = {};
    if (teacherId) where.teacherId = teacherId;

    const salaryPayments = await db.salaryPayment.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            classes: true,
            subjects: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
    });

    const result = salaryPayments.map((sp) => ({
      ...sp,
      teacher: {
        ...sp.teacher,
        classes: JSON.parse(sp.teacher.classes),
        subjects: JSON.parse(sp.teacher.subjects),
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get salary payments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      teacherId,
      month,
      year,
      totalYearlyEarning,
      totalReceivedFees,
      amount,
      paymentMode,
    } = body;

    if (!teacherId || !month || !year || amount === undefined) {
      return NextResponse.json(
        { error: 'teacherId, month, year, and amount are required' },
        { status: 400 }
      );
    }

    const teacher = await db.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    const salaryPayment = await db.salaryPayment.create({
      data: {
        teacherId,
        month: parseInt(String(month)),
        year: parseInt(String(year)),
        totalYearlyEarning: parseFloat(String(totalYearlyEarning || 0)),
        totalReceivedFees: parseFloat(String(totalReceivedFees || 0)),
        amount: parseFloat(String(amount)),
        paymentMode: paymentMode || 'Offline',
        paidAt: new Date(),
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            classes: true,
            subjects: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ...salaryPayment,
        teacher: {
          ...salaryPayment.teacher,
          classes: JSON.parse(salaryPayment.teacher.classes),
          subjects: JSON.parse(salaryPayment.teacher.subjects),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Pay salary error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
