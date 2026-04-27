import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId, toTimestamp, fromTimestamp, admin } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    // Build Firestore query
    let query = getDb().collection('salaryPayments') as admin.firestore.Query;

    if (teacherId) query = query.where('teacherId', '==', teacherId);

    const salaryPaymentsSnapshot = await query.get();

    const result = [];
    for (const doc of salaryPaymentsSnapshot.docs) {
      const data = doc.data();

      // Fetch teacher info
      let teacher = null;
      if (data.teacherId) {
        const teacherDoc = await getDb().collection('teachers').doc(data.teacherId).get();
        if (teacherDoc.exists) {
          const tData = teacherDoc.data()!;
          teacher = {
            id: teacherDoc.id,
            name: tData.name,
            classes: tData.classes, // native array, no JSON.parse
            subjects: tData.subjects, // native array, no JSON.parse
          };
        }
      }

      result.push({
        id: doc.id,
        teacherId: data.teacherId,
        month: data.month,
        year: data.year,
        totalYearlyEarning: data.totalYearlyEarning,
        totalReceivedFees: data.totalReceivedFees,
        amount: data.amount,
        paymentMode: data.paymentMode,
        paidAt: fromTimestamp(data.paidAt),
        createdAt: fromTimestamp(data.createdAt),
        teacher,
      });
    }

    // Sort by year desc, then month asc (replacing Firestore orderBy)
    result.sort((a, b) => b.year - a.year || a.month - b.month);

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

    // Check teacher exists
    const teacherDoc = await getDb().collection('teachers').doc(teacherId).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }
    const teacherData = teacherDoc.data()!;

    // Create salary payment
    const salaryPaymentId = generateId();
    const paidAtDate = new Date();
    await getDb().collection('salaryPayments').doc(salaryPaymentId).set({
      teacherId,
      month: parseInt(String(month)),
      year: parseInt(String(year)),
      totalYearlyEarning: parseFloat(String(totalYearlyEarning || 0)),
      totalReceivedFees: parseFloat(String(totalReceivedFees || 0)),
      amount: parseFloat(String(amount)),
      paymentMode: paymentMode || 'Offline',
      paidAt: toTimestamp(paidAtDate),
      createdAt: toTimestamp(new Date()),
    });

    await notifyDataChange('salaryPayments', 'create');

    return NextResponse.json(
      {
        id: salaryPaymentId,
        teacherId,
        month: parseInt(String(month)),
        year: parseInt(String(year)),
        totalYearlyEarning: parseFloat(String(totalYearlyEarning || 0)),
        totalReceivedFees: parseFloat(String(totalReceivedFees || 0)),
        amount: parseFloat(String(amount)),
        paymentMode: paymentMode || 'Offline',
        paidAt: paidAtDate.toISOString(),
        createdAt: null, // server timestamp not yet resolved
        teacher: {
          id: teacherDoc.id,
          name: teacherData.name,
          classes: teacherData.classes, // native array, no JSON.parse
          subjects: teacherData.subjects, // native array, no JSON.parse
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
