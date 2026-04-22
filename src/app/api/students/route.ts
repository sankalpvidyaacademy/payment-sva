import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    const where: Record<string, unknown> = {};
    if (className) {
      where.className = className;
    }

    const students = await db.student.findMany({
      where,
      include: {
        subjectFees: true,
        feePayments: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = students.map((s) => ({
      ...s,
      subjects: JSON.parse(s.subjects),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get students error:', error);
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
      name,
      className,
      subjects,
      totalYearlyFee,
      coachingFee,
      monthlyFee,
      subjectFees,
      username,
      password,
    } = body;

    if (!name || !className || !username || !password) {
      return NextResponse.json(
        { error: 'Name, className, username, and password are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 10);

    // Create User first
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'STUDENT',
        name,
      },
    });

    // Create Student with subjectFees
    const student = await db.student.create({
      data: {
        userId: user.id,
        name,
        className,
        subjects: JSON.stringify(subjects || []),
        totalYearlyFee: totalYearlyFee || 0,
        coachingFee: coachingFee || 0,
        monthlyFee: monthlyFee || 0,
        subjectFees: {
          create: (subjectFees || []).map(
            (sf: { subject: string; yearlyFee: number }) => ({
              subject: sf.subject,
              yearlyFee: sf.yearlyFee || 0,
            })
          ),
        },
      },
      include: {
        subjectFees: true,
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...student,
        subjects: JSON.parse(student.subjects),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      className,
      subjects,
      totalYearlyFee,
      coachingFee,
      monthlyFee,
      subjectFees,
      username,
      password,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Student id is required' },
        { status: 400 }
      );
    }

    const existingStudent = await db.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Update user if username or name or password changed
    const userUpdateData: Record<string, unknown> = {};
    if (name) userUpdateData.name = name;
    if (username) userUpdateData.username = username;
    if (password) userUpdateData.password = hashSync(password, 10);

    if (Object.keys(userUpdateData).length > 0) {
      await db.user.update({
        where: { id: existingStudent.userId },
        data: userUpdateData,
      });
    }

    // Update student
    const studentUpdateData: Record<string, unknown> = {};
    if (name) studentUpdateData.name = name;
    if (className) studentUpdateData.className = className;
    if (subjects !== undefined)
      studentUpdateData.subjects = JSON.stringify(subjects);
    if (totalYearlyFee !== undefined)
      studentUpdateData.totalYearlyFee = totalYearlyFee;
    if (coachingFee !== undefined) studentUpdateData.coachingFee = coachingFee;
    if (monthlyFee !== undefined) studentUpdateData.monthlyFee = monthlyFee;

    if (subjectFees !== undefined) {
      // Delete existing subject fees and recreate
      await db.subjectFee.deleteMany({
        where: { studentId: id },
      });
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...studentUpdateData,
        ...(subjectFees !== undefined && {
          subjectFees: {
            create: subjectFees.map(
              (sf: { subject: string; yearlyFee: number }) => ({
                subject: sf.subject,
                yearlyFee: sf.yearlyFee || 0,
              })
            ),
          },
        }),
      },
      include: {
        subjectFees: true,
        feePayments: true,
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
    });

    return NextResponse.json({
      ...student,
      subjects: JSON.parse(student.subjects),
    });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
