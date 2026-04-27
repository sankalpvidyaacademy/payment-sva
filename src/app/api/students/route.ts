import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId, toTimestamp, fromTimestamp } from '@/lib/firebase-admin';
import { hashSync } from 'bcryptjs';
import { notifyDataChange } from '@/lib/realtime-notify';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    const snapshot = await getDb()
      .collection('students')
      .get();

    const students = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Filter by className if provided
      if (className && data.className !== className) {
        continue;
      }

      // Fetch sub-collections and user in parallel
      const [subjectFeesSnap, feePaymentsSnap, monthlyFeeDistributionsSnap, userDoc] =
        await Promise.all([
          getDb().collection('subjectFees').where('studentId', '==', doc.id).get(),
          getDb().collection('feePayments').where('studentId', '==', doc.id).get(),
          getDb().collection('monthlyFeeDistributions').where('studentId', '==', doc.id).get(),
          getDb().collection('users').doc(data.userId).get(),
        ]);

      const subjectFees = subjectFeesSnap.docs.map((sfDoc) => ({
        id: sfDoc.id,
        studentId: doc.id,
        subject: sfDoc.data().subject,
        yearlyFee: sfDoc.data().yearlyFee,
      }));

      const feePayments = feePaymentsSnap.docs
        .map((fpDoc) => {
          const fpData = fpDoc.data();
          return {
            id: fpDoc.id,
            studentId: doc.id,
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
          studentId: doc.id,
          month: mfdDoc.data().month,
          year: mfdDoc.data().year,
          amount: mfdDoc.data().amount,
        }))
        .sort((a, b) => a.year - b.year || a.month - b.month);

      const userData = userDoc.exists ? userDoc.data() : null;

      students.push({
        id: doc.id,
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
      });
    }

    // Sort by createdAt descending (replacing Firestore orderBy)
    students.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json(students);
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
      dob,
      subjects,
      totalYearlyFee,
      coachingFee,
      monthlyFee,
      subjectFees,
      monthlyFeeDistributions,
      username,
      password,
    } = body;

    if (!name || !className || !username || !password) {
      return NextResponse.json(
        { error: 'Name, className, username, and password are required' },
        { status: 400 }
      );
    }

    if (!dob) {
      return NextResponse.json(
        { error: 'Date of birth is required' },
        { status: 400 }
      );
    }

    if (!coachingFee || coachingFee <= 0) {
      return NextResponse.json(
        { error: 'Coaching fee is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUserSnap = await getDb()
      .collection('users')
      .where('username', '==', username)
      .get();

    if (!existingUserSnap.empty) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 10);
    const userId = generateId();
    const studentId = generateId();
    const now = toTimestamp(new Date())!;

    // Use batch write for atomicity
    const batch = getDb().batch();

    // Create user
    batch.set(getDb().collection('users').doc(userId), {
      username,
      password: hashedPassword,
      role: 'STUDENT',
      name,
      createdAt: now,
      updatedAt: now,
    });

    // Create student
    batch.set(getDb().collection('students').doc(studentId), {
      userId,
      name,
      dob: toTimestamp(dob),
      className,
      subjects: subjects || [],
      totalYearlyFee: totalYearlyFee || 0,
      coachingFee: coachingFee || 0,
      monthlyFee: monthlyFee || 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create subjectFees
    const sfIds: string[] = [];
    for (const sf of (subjectFees || []) as { subject: string; yearlyFee: number }[]) {
      const sfId = generateId();
      sfIds.push(sfId);
      batch.set(getDb().collection('subjectFees').doc(sfId), {
        studentId,
        subject: sf.subject,
        yearlyFee: sf.yearlyFee || 0,
      });
    }

    // Create monthlyFeeDistributions
    const mfdIds: string[] = [];
    for (const mfd of (monthlyFeeDistributions || []) as { month: number; year: number; amount: number }[]) {
      const mfdId = generateId();
      mfdIds.push(mfdId);
      batch.set(getDb().collection('monthlyFeeDistributions').doc(mfdId), {
        studentId,
        month: mfd.month,
        year: mfd.year,
        amount: mfd.amount || 0,
      });
    }

    await batch.commit();

    // Notify realtime
    notifyDataChange('students', 'create', studentId);

    // Build response matching Prisma format exactly
    const response = {
      id: studentId,
      userId,
      name,
      dob: dob ? new Date(dob).toISOString() : null,
      className,
      subjects: subjects || [],
      totalYearlyFee: totalYearlyFee || 0,
      coachingFee: coachingFee || 0,
      monthlyFee: monthlyFee || 0,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      subjectFees: (subjectFees || []).map(
        (sf: { subject: string; yearlyFee: number }, i: number) => ({
          id: sfIds[i],
          studentId,
          subject: sf.subject,
          yearlyFee: sf.yearlyFee || 0,
        })
      ),
      feePayments: [],
      monthlyFeeDistributions: (monthlyFeeDistributions || []).map(
        (mfd: { month: number; year: number; amount: number }, i: number) => ({
          id: mfdIds[i],
          studentId,
          month: mfd.month,
          year: mfd.year,
          amount: mfd.amount || 0,
        })
      ),
      user: {
        id: userId,
        username,
        role: 'STUDENT',
        name,
      },
    };

    return NextResponse.json(response, { status: 201 });
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
      dob,
      subjects,
      totalYearlyFee,
      coachingFee,
      monthlyFee,
      subjectFees,
      monthlyFeeDistributions,
      username,
      password,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Student id is required' },
        { status: 400 }
      );
    }

    // Fetch existing student
    const studentDoc = await getDb().collection('students').doc(id).get();

    if (!studentDoc.exists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    const existingData = studentDoc.data()!;

    // Update user if username or name or password changed
    const userUpdateData: Record<string, unknown> = {};
    if (name) userUpdateData.name = name;
    if (username) userUpdateData.username = username;
    if (password) userUpdateData.password = hashSync(password, 10);

    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = toTimestamp(new Date());
      await getDb().collection('users').doc(existingData.userId).update(userUpdateData);
    }

    // Update student fields
    const studentUpdateData: Record<string, unknown> = {
      updatedAt: toTimestamp(new Date()),
    };
    if (name) studentUpdateData.name = name;
    if (dob !== undefined) studentUpdateData.dob = toTimestamp(dob);
    if (className) studentUpdateData.className = className;
    if (subjects !== undefined) studentUpdateData.subjects = subjects;
    if (totalYearlyFee !== undefined) studentUpdateData.totalYearlyFee = totalYearlyFee;
    if (coachingFee !== undefined) studentUpdateData.coachingFee = coachingFee;
    if (monthlyFee !== undefined) studentUpdateData.monthlyFee = monthlyFee;

    // Handle subjectFees and monthlyFeeDistributions: delete existing and recreate in a single batch
    if (subjectFees !== undefined || monthlyFeeDistributions !== undefined) {
      const subBatch = getDb().batch();

      if (subjectFees !== undefined) {
        const existingSFSnap = await getDb()
          .collection('subjectFees')
          .where('studentId', '==', id)
          .get();
        for (const sfDoc of existingSFSnap.docs) {
          subBatch.delete(sfDoc.ref);
        }
        for (const sf of subjectFees as { subject: string; yearlyFee: number }[]) {
          const sfId = generateId();
          subBatch.set(getDb().collection('subjectFees').doc(sfId), {
            studentId: id,
            subject: sf.subject,
            yearlyFee: sf.yearlyFee || 0,
          });
        }
      }

      if (monthlyFeeDistributions !== undefined) {
        const existingMFDSnap = await getDb()
          .collection('monthlyFeeDistributions')
          .where('studentId', '==', id)
          .get();
        for (const mfdDoc of existingMFDSnap.docs) {
          subBatch.delete(mfdDoc.ref);
        }
        for (const mfd of monthlyFeeDistributions as { month: number; year: number; amount: number }[]) {
          const mfdId = generateId();
          subBatch.set(getDb().collection('monthlyFeeDistributions').doc(mfdId), {
            studentId: id,
            month: mfd.month,
            year: mfd.year,
            amount: mfd.amount || 0,
          });
        }
      }

      await subBatch.commit();
    }

    // Update student document
    await getDb().collection('students').doc(id).update(studentUpdateData);

    // Notify realtime
    notifyDataChange('students', 'update', id);

    // Fetch the updated student with all sub-collections for response
    const [updatedStudentDoc, subjectFeesSnap, feePaymentsSnap, monthlyFeeDistributionsSnap, userDoc] =
      await Promise.all([
        getDb().collection('students').doc(id).get(),
        getDb().collection('subjectFees').where('studentId', '==', id).get(),
        getDb().collection('feePayments').where('studentId', '==', id).get(),
        getDb().collection('monthlyFeeDistributions').where('studentId', '==', id).get(),
        getDb().collection('users').doc(existingData.userId).get(),
      ]);

    const updatedData = updatedStudentDoc.data()!;
    const userData = userDoc.data();

    const response = {
      id: updatedStudentDoc.id,
      userId: updatedData.userId,
      name: updatedData.name,
      dob: fromTimestamp(updatedData.dob),
      className: updatedData.className,
      subjects: updatedData.subjects || [],
      totalYearlyFee: updatedData.totalYearlyFee,
      coachingFee: updatedData.coachingFee,
      monthlyFee: updatedData.monthlyFee,
      createdAt: fromTimestamp(updatedData.createdAt),
      updatedAt: fromTimestamp(updatedData.updatedAt),
      subjectFees: subjectFeesSnap.docs.map((sfDoc) => ({
        id: sfDoc.id,
        studentId: id,
        subject: sfDoc.data().subject,
        yearlyFee: sfDoc.data().yearlyFee,
      })),
      feePayments: feePaymentsSnap.docs
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
        .sort((a, b) => a.year - b.year || a.month - b.month),
      monthlyFeeDistributions: monthlyFeeDistributionsSnap.docs
        .map((mfdDoc) => ({
          id: mfdDoc.id,
          studentId: id,
          month: mfdDoc.data().month,
          year: mfdDoc.data().year,
          amount: mfdDoc.data().amount,
        }))
        .sort((a, b) => a.year - b.year || a.month - b.month),
      user: {
        id: userDoc.id,
        username: userData!.username,
        role: userData!.role,
        name: userData!.name,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
