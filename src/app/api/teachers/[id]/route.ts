import { NextRequest, NextResponse } from 'next/server';
import { getDb, fromTimestamp } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teacherDoc = await getDb().collection('teachers').doc(id).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    const teacher = { id: teacherDoc.id, ...teacherDoc.data() };

    // Fetch salaryPayments
    const salarySnapshot = await getDb().collection('salaryPayments')
      .where('teacherId', '==', id)
      .get();
    const salaryPayments = salarySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      paidAt: fromTimestamp(doc.data().paidAt),
      createdAt: fromTimestamp(doc.data().createdAt),
    })).sort((a, b) => a.year - b.year || a.month - b.month);

    // Fetch user
    let user = null;
    if (teacher.userId) {
      const userDoc = await getDb().collection('users').doc(teacher.userId).get();
      if (userDoc.exists) {
        user = {
          id: userDoc.id,
          username: userDoc.data()!.username,
          role: userDoc.data()!.role,
          name: userDoc.data()!.name,
        };
      }
    }

    return NextResponse.json({
      ...teacher,
      classes: teacher.classes, // native array, no JSON.parse
      subjects: teacher.subjects, // native array, no JSON.parse
      classSubjects: teacher.classSubjects, // native array, no JSON.parse
      salaryPayments,
      user,
      createdAt: fromTimestamp(teacher.createdAt),
      updatedAt: fromTimestamp(teacher.updatedAt),
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

    const teacherDoc = await getDb().collection('teachers').doc(id).get();

    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    const teacher = { id: teacherDoc.id, ...teacherDoc.data() };

    // Delete all related salaryPayments
    const salarySnapshot = await getDb().collection('salaryPayments')
      .where('teacherId', '==', id)
      .get();
    const deleteSalaryPromises = salarySnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deleteSalaryPromises);

    // Delete teacher doc
    await getDb().collection('teachers').doc(id).delete();

    // Delete user doc
    if (teacher.userId) {
      await getDb().collection('users').doc(teacher.userId).delete();
    }

    notifyDataChange('teachers', 'delete', id);

    return NextResponse.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
