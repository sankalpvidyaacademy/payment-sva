import { NextRequest, NextResponse } from 'next/server';
import { getDb, fromTimestamp } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const studentDoc = await getDb().collection('students').doc(id).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const data = studentDoc.data()!;

    // Fetch sub-collections and user in parallel
    const [subjectFeesSnap, feePaymentsSnap, monthlyFeeDistributionsSnap, userDoc] =
      await Promise.all([
        getDb().collection('subjectFees').where('studentId', '==', id).get(),
        getDb().collection('feePayments').where('studentId', '==', id).get(),
        getDb().collection('monthlyFeeDistributions').where('studentId', '==', id).get(),
        getDb().collection('users').doc(data.userId).get(),
      ]);

    const subjectFees = subjectFeesSnap.docs.map((sfDoc) => ({
      id: sfDoc.id,
      studentId: id,
      subject: sfDoc.data().subject,
      yearlyFee: sfDoc.data().yearlyFee,
    }));

    const feePayments = feePaymentsSnap.docs
      .map((fpDoc) => {
        const fpData = fpDoc.data();
        return {
          id: fpDoc.id,
          studentId: id,
          month: fpData.month,
          year: fpData.year,
          amountDue: fpData.amountDue,
          amountPaid: fpData.amountPaid,
          paymentMode: fpData.paymentMode,
          slipNumber: fpData.slipNumber,
          paidAt: fromTimestamp(fpData.paidAt),
          createdAt: fromTimestamp(fpData.createdAt),
        };
      })
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const monthlyFeeDistributions = monthlyFeeDistributionsSnap.docs
      .map((mfdDoc) => ({
        id: mfdDoc.id,
        studentId: id,
        month: mfdDoc.data().month,
        year: mfdDoc.data().year,
        amount: mfdDoc.data().amount,
      }))
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const userData = userDoc.exists ? userDoc.data() : null;

    const response = {
      id: studentDoc.id,
      userId: data.userId,
      name: data.name,
      dob: fromTimestamp(data.dob),
      className: data.className,
      subjects: data.subjects || [],
      totalYearlyFee: data.totalYearlyFee,
      coachingFee: data.coachingFee,
      monthlyFee: data.monthlyFee,
      createdAt: fromTimestamp(data.createdAt),
      updatedAt: fromTimestamp(data.updatedAt),
      subjectFees,
      feePayments,
      monthlyFeeDistributions,
      user: userData
        ? {
            id: userDoc.id,
            username: userData.username,
            role: userData.role,
            name: userData.name,
          }
        : null,
    };

    return NextResponse.json(response);
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

    const studentDoc = await getDb().collection('students').doc(id).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const data = studentDoc.data()!;

    // Fetch all related sub-collections in parallel before deleting
    const [subjectFeesSnap, feePaymentsSnap, monthlyFeeDistributionsSnap] =
      await Promise.all([
        getDb().collection('subjectFees').where('studentId', '==', id).get(),
        getDb().collection('feePayments').where('studentId', '==', id).get(),
        getDb().collection('monthlyFeeDistributions').where('studentId', '==', id).get(),
      ]);

    // Delete everything in a single batch for atomicity
    const batch = getDb().batch();

    // Delete user
    batch.delete(getDb().collection('users').doc(data.userId));

    // Delete subjectFees
    for (const sfDoc of subjectFeesSnap.docs) {
      batch.delete(sfDoc.ref);
    }

    // Delete feePayments
    for (const fpDoc of feePaymentsSnap.docs) {
      batch.delete(fpDoc.ref);
    }

    // Delete monthlyFeeDistributions
    for (const mfdDoc of monthlyFeeDistributionsSnap.docs) {
      batch.delete(mfdDoc.ref);
    }

    // Delete student
    batch.delete(getDb().collection('students').doc(id));

    await batch.commit();

    // Notify realtime
    notifyDataChange('students', 'delete', id);

    return NextResponse.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
