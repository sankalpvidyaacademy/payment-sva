import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId, toTimestamp, fromTimestamp } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const snapshot = await getDb().collection('expenses').get();

    let expenses = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        month: data.month,
        year: data.year,
        amount: data.amount,
        purpose: data.purpose,
        createdAt: fromTimestamp(data.createdAt),
      };
    });

    // Filter by month/year in-memory
    if (month) {
      const monthInt = parseInt(month);
      expenses = expenses.filter((e) => e.month === monthInt);
    }
    if (year) {
      const yearInt = parseInt(year);
      expenses = expenses.filter((e) => e.year === yearInt);
    }

    // Sort by createdAt descending (replacing Firestore orderBy)
    expenses.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
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

    const id = generateId();
    const expenseData = {
      month: parseInt(String(month)),
      year: parseInt(String(year)),
      amount: parseFloat(String(amount)),
      purpose,
      createdAt: toTimestamp(new Date()),
    };

    await getDb().collection('expenses').doc(id).set(expenseData);

    const expense = {
      id,
      month: expenseData.month,
      year: expenseData.year,
      amount: expenseData.amount,
      purpose: expenseData.purpose,
      createdAt: new Date().toISOString(),
    };

    // Notify realtime clients
    notifyDataChange('expenses', 'create', id);

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

    const docRef = getDb().collection('expenses').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    await docRef.delete();

    // Notify realtime clients
    notifyDataChange('expenses', 'delete', id);

    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
