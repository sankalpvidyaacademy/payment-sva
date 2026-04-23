import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacher = await db.teacher.findUnique({
      where: { id },
      include: {
        salaryPayments: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...teacher,
      classes: JSON.parse(teacher.classes),
      subjects: JSON.parse(teacher.subjects),
      classSubjects: JSON.parse(teacher.classSubjects),
    });
  } catch (error) {
    console.error('Get teacher error:', error);
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

    const teacher = await db.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Delete the user first — cascading will handle Teacher, SalaryPayments
    await db.user.delete({
      where: { id: teacher.userId },
    });

    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
