import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: {
        subjectFees: true,
        feePayments: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        monthlyFeeDistributions: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...student,
      subjects: JSON.parse(student.subjects),
    });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const student = await db.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Delete the user first — cascading will handle Student, SubjectFees, FeePayments, MonthlyFeeDistributions
    await db.user.delete({
      where: { id: student.userId },
    });

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
