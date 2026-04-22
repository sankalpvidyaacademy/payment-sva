import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const where: Record<string, unknown> = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const expenses = await db.expense.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year, amount, purpose } = body;

    if (!month || !year || !amount || !purpose) {
      return NextResponse.json(
        { error: 'month, year, amount, and purpose are required' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        month: parseInt(String(month)),
        year: parseInt(String(year)),
        amount: parseFloat(String(amount)),
        purpose,
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Add expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Expense id is required' },
        { status: 400 }
      );
    }

    const expense = await db.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    await db.expense.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
