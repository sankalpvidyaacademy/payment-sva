import { NextResponse } from 'next/server';
import { getDb, toTimestamp } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';

// Helper: fetch all documents from a collection, converting Timestamps to ISO strings
async function fetchCollection(collectionName: string) {
  const snapshot = await getDb().collection(collectionName).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const result: Record<string, unknown> = { id: doc.id };

    for (const [key, value] of Object.entries(data)) {
      // Convert Firestore Timestamps to ISO strings
      if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        result[key] = value.toDate().toISOString();
      } else if (value && typeof value === 'object' && value._seconds !== undefined && value._nanoseconds !== undefined) {
        // Handle raw Timestamp-like objects
        result[key] = new Date(value._seconds * 1000 + value._nanoseconds / 1000000).toISOString();
      } else {
        result[key] = value;
      }
    }

    return result;
  });
}

// Helper: delete all documents in a collection
async function clearCollection(collectionName: string) {
  const snapshot = await getDb().collection(collectionName).get();
  if (snapshot.empty) return;

  const batchSize = 500;
  const docs = snapshot.docs;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = getDb().batch();
    const chunk = docs.slice(i, i + batchSize);
    for (const doc of chunk) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

// Helper: convert a string field to Firestore Timestamp if it looks like an ISO date
function convertDateField(value: unknown) {
  if (!value) return null;
  if (typeof value === 'string') {
    return toTimestamp(value);
  }
  return value;
}

export async function GET() {
  try {
    const users = await fetchCollection('users');
    const students = await fetchCollection('students');
    const subjectFees = await fetchCollection('subjectFees');
    const feePayments = await fetchCollection('feePayments');
    const monthlyFeeDistributions = await fetchCollection('monthlyFeeDistributions');
    const teachers = await fetchCollection('teachers');
    const salaryPayments = await fetchCollection('salaryPayments');
    const expenses = await fetchCollection('expenses');

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.1',
      data: {
        users,
        students,
        subjectFees,
        feePayments,
        monthlyFeeDistributions,
        teachers,
        salaryPayments,
        expenses,
      },
    };

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Export backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Backup data is required' },
        { status: 400 }
      );
    }

    // Clear all collections in reverse dependency order
    await clearCollection('salaryPayments');
    await clearCollection('feePayments');
    await clearCollection('monthlyFeeDistributions');
    await clearCollection('subjectFees');
    await clearCollection('expenses');
    await clearCollection('students');
    await clearCollection('teachers');
    await clearCollection('users');

    // Helper: batch write documents to a collection
    async function batchWrite(collectionName: string, items: Array<Record<string, unknown>>) {
      const batchSize = 500;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = getDb().batch();
        const chunk = items.slice(i, i + batchSize);
        for (const item of chunk) {
          const { id, ...rest } = item;
          const docRef = getDb().collection(collectionName).doc(String(id));
          batch.set(docRef, rest);
        }
        await batch.commit();
      }
    }

    // 1. Users first (no dependencies)
    if (data.users && Array.isArray(data.users)) {
      const users = data.users.map((user: Record<string, unknown>) => ({
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        name: user.name,
        createdAt: convertDateField(user.createdAt),
        updatedAt: convertDateField(user.updatedAt),
      }));
      await batchWrite('users', users);
    }

    // 2. Students (depends on User)
    if (data.students && Array.isArray(data.students)) {
      const students = data.students.map((student: Record<string, unknown>) => ({
        id: student.id,
        userId: student.userId,
        name: student.name,
        dob: convertDateField(student.dob),
        className: student.className,
        subjects: student.subjects, // native array — no JSON.stringify
        totalYearlyFee: student.totalYearlyFee,
        coachingFee: student.coachingFee,
        monthlyFee: student.monthlyFee,
        createdAt: convertDateField(student.createdAt),
        updatedAt: convertDateField(student.updatedAt),
      }));
      await batchWrite('students', students);
    }

    // 3. SubjectFees (depends on Student)
    if (data.subjectFees && Array.isArray(data.subjectFees)) {
      const subjectFees = data.subjectFees.map((sf: Record<string, unknown>) => ({
        id: sf.id,
        studentId: sf.studentId,
        subject: sf.subject,
        yearlyFee: sf.yearlyFee,
      }));
      await batchWrite('subjectFees', subjectFees);
    }

    // 4. FeePayments (depends on Student)
    if (data.feePayments && Array.isArray(data.feePayments)) {
      const feePayments = data.feePayments.map((fp: Record<string, unknown>) => ({
        id: fp.id,
        studentId: fp.studentId,
        month: fp.month,
        year: fp.year,
        amountDue: fp.amountDue,
        amountPaid: fp.amountPaid,
        paymentMode: fp.paymentMode,
        slipNumber: fp.slipNumber || null,
        paidAt: convertDateField(fp.paidAt),
        createdAt: convertDateField(fp.createdAt),
      }));
      await batchWrite('feePayments', feePayments);
    }

    // 5. MonthlyFeeDistributions (depends on Student)
    if (data.monthlyFeeDistributions && Array.isArray(data.monthlyFeeDistributions)) {
      const monthlyFeeDistributions = data.monthlyFeeDistributions.map((mfd: Record<string, unknown>) => ({
        id: mfd.id,
        studentId: mfd.studentId,
        month: mfd.month,
        year: mfd.year,
        amount: mfd.amount,
      }));
      await batchWrite('monthlyFeeDistributions', monthlyFeeDistributions);
    }

    // 6. Teachers (depends on User)
    if (data.teachers && Array.isArray(data.teachers)) {
      const teachers = data.teachers.map((teacher: Record<string, unknown>) => ({
        id: teacher.id,
        userId: teacher.userId,
        name: teacher.name,
        classes: teacher.classes, // native array — no JSON.stringify
        subjects: teacher.subjects, // native array — no JSON.stringify
        classSubjects: teacher.classSubjects, // native array of objects — no JSON.stringify
        createdAt: convertDateField(teacher.createdAt),
        updatedAt: convertDateField(teacher.updatedAt),
      }));
      await batchWrite('teachers', teachers);
    }

    // 7. SalaryPayments (depends on Teacher)
    if (data.salaryPayments && Array.isArray(data.salaryPayments)) {
      const salaryPayments = data.salaryPayments.map((sp: Record<string, unknown>) => ({
        id: sp.id,
        teacherId: sp.teacherId,
        month: sp.month,
        year: sp.year,
        totalYearlyEarning: sp.totalYearlyEarning,
        totalReceivedFees: sp.totalReceivedFees,
        amount: sp.amount,
        paymentMode: sp.paymentMode,
        paidAt: convertDateField(sp.paidAt),
        createdAt: convertDateField(sp.createdAt),
      }));
      await batchWrite('salaryPayments', salaryPayments);
    }

    // 8. Expenses (no dependencies)
    if (data.expenses && Array.isArray(data.expenses)) {
      const expenses = data.expenses.map((expense: Record<string, unknown>) => ({
        id: expense.id,
        month: expense.month,
        year: expense.year,
        amount: expense.amount,
        purpose: expense.purpose,
        createdAt: convertDateField(expense.createdAt),
      }));
      await batchWrite('expenses', expenses);
    }

    // Notify realtime clients
    notifyDataChange('backup', 'update');

    return NextResponse.json({
      message: 'Backup restored successfully',
      counts: {
        users: data.users?.length || 0,
        students: data.students?.length || 0,
        subjectFees: data.subjectFees?.length || 0,
        feePayments: data.feePayments?.length || 0,
        monthlyFeeDistributions: data.monthlyFeeDistributions?.length || 0,
        teachers: data.teachers?.length || 0,
        salaryPayments: data.salaryPayments?.length || 0,
        expenses: data.expenses?.length || 0,
      },
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
