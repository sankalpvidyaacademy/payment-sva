import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const feePayment = await db.feePayment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            className: true,
            monthlyFee: true,
            totalYearlyFee: true,
            subjects: true,
          },
        },
      },
    });

    if (!feePayment) {
      return NextResponse.json(
        { error: 'Fee payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...feePayment,
      student: {
        ...feePayment.student,
        subjects: JSON.parse(feePayment.student.subjects),
      },
    });
  } catch (error) {
    console.error('Get fee payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
