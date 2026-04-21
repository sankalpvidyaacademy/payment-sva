import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    const teachers = await db.teacher.findMany({
      include: {
        salaryPayments: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let result = teachers.map((t) => ({
      ...t,
      classes: JSON.parse(t.classes),
      subjects: JSON.parse(t.subjects),
    }));

    // Filter by className if provided
    if (className) {
      result = result.filter((t) => t.classes.includes(className));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, classes, subjects, username, password } = body;

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
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
        role: 'TEACHER',
        name,
      },
    });

    // Create Teacher
    const teacher = await db.teacher.create({
      data: {
        userId: user.id,
        name,
        classes: JSON.stringify(classes || []),
        subjects: JSON.stringify(subjects || []),
      },
      include: {
        salaryPayments: true,
        user: {
          select: { id: true, username: true, role: true, name: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...teacher,
        classes: JSON.parse(teacher.classes),
        subjects: JSON.parse(teacher.subjects),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
