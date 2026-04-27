import { NextRequest, NextResponse } from 'next/server';
import { getDb, fromTimestamp } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const feePaymentDoc = await getDb().collection('feePayments').doc(id).get();

    if (!feePaymentDoc.exists) {
      return NextResponse.json(
        { error: 'Fee payment not found' },
        { status: 404 }
      );
    }

    const data = feePaymentDoc.data()!;

    // Fetch student info
    let student = null;
    if (data.studentId) {
      const studentDoc = await getDb().collection('students').doc(data.studentId).get();
      if (studentDoc.exists) {
        const sData = studentDoc.data()!;
        student = {
          id: studentDoc.id,
          name: sData.name,
          className: sData.className,
          monthlyFee: sData.monthlyFee,
          totalYearlyFee: sData.totalYearlyFee,
          subjects: sData.subjects, // native array, no JSON.parse
        };
      }
    }

    return NextResponse.json({
      id: feePaymentDoc.id,
      studentId: data.studentId,
      month: data.month,
      year: data.year,
      amountDue: data.amountDue,
      amountPaid: data.amountPaid,
      paymentMode: data.paymentMode,
      slipNumber: data.slipNumber,
      paidAt: fromTimestamp(data.paidAt),
      createdAt: fromTimestamp(data.createdAt),
      student,
    });
  } catch (error) {
    console.error('Get fee payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
