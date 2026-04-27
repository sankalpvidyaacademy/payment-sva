import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId, toTimestamp, fromTimestamp } from '@/lib/firebase-admin';
import { notifyDataChange } from '@/lib/realtime-notify';
import { hashSync } from 'bcryptjs';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, classes, subjects, username, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      );
    }

    // Fetch existing teacher
    const teacherDoc = await getDb().collection('teachers').doc(id).get();
    if (!teacherDoc.exists) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }
    const existingTeacher = { id: teacherDoc.id, ...teacherDoc.data() };

    // Fetch associated user
    const userDoc = await getDb().collection('users').doc(existingTeacher.userId).get();
    const existingUser = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;

    // If username is changing, check for duplicates
    if (username && existingUser && username !== existingUser.username) {
      const duplicateSnapshot = await getDb().collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
      if (!duplicateSnapshot.empty) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 409 }
        );
      }
    }

    // Update User record
    const userUpdateData: Record<string, unknown> = {};
    if (name) userUpdateData.name = name;
    if (username) userUpdateData.username = username;
    if (password) userUpdateData.password = hashSync(password, 10);

    if (Object.keys(userUpdateData).length > 0) {
      userUpdateData.updatedAt = toTimestamp(new Date());
      await getDb().collection('users').doc(existingTeacher.userId).update(userUpdateData);
    }

    // Update Teacher record
    const teacherUpdateData: Record<string, unknown> = {};
    if (name) teacherUpdateData.name = name;
    if (classes) teacherUpdateData.classes = classes; // native array, no JSON.stringify
    if (subjects) teacherUpdateData.subjects = subjects; // native array, no JSON.stringify
    if (body.classSubjects !== undefined) teacherUpdateData.classSubjects = body.classSubjects; // native array of objects

    if (Object.keys(teacherUpdateData).length > 0) {
      teacherUpdateData.updatedAt = toTimestamp(new Date());
      await getDb().collection('teachers').doc(id).update(teacherUpdateData);
    }

    // Fetch and return updated teacher with salaryPayments and user
    const updatedTeacherDoc = await getDb().collection('teachers').doc(id).get();
    const updatedTeacher = { id: updatedTeacherDoc.id, ...updatedTeacherDoc.data() };

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
    const updatedUserDoc = await getDb().collection('users').doc(updatedTeacher.userId).get();
    const user = updatedUserDoc.exists
      ? { id: updatedUserDoc.id, username: updatedUserDoc.data()!.username, role: updatedUserDoc.data()!.role, name: updatedUserDoc.data()!.name }
      : null;

    notifyDataChange('teachers', 'update', id);

    return NextResponse.json({
      ...updatedTeacher,
      classes: updatedTeacher.classes, // native array
      subjects: updatedTeacher.subjects, // native array
      classSubjects: updatedTeacher.classSubjects, // native array
      salaryPayments,
      user,
      createdAt: fromTimestamp(updatedTeacher.createdAt),
      updatedAt: fromTimestamp(updatedTeacher.updatedAt),
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const className = searchParams.get('className');

    const teachersSnapshot = await getDb().collection('teachers')
      .get();

    const teachers = teachersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    let result = [];

    for (const t of teachers) {
      // Fetch salaryPayments for each teacher
      const salarySnapshot = await getDb().collection('salaryPayments')
        .where('teacherId', '==', t.id)
        .get();
      const salaryPayments = salarySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        paidAt: fromTimestamp(doc.data().paidAt),
        createdAt: fromTimestamp(doc.data().createdAt),
      })).sort((a, b) => a.year - b.year || a.month - b.month);

      // Fetch user
      let user = null;
      if (t.userId) {
        const userDoc = await getDb().collection('users').doc(t.userId).get();
        if (userDoc.exists) {
          user = {
            id: userDoc.id,
            username: userDoc.data()!.username,
            role: userDoc.data()!.role,
            name: userDoc.data()!.name,
          };
        }
      }

      result.push({
        ...t,
        classes: t.classes, // native array, no JSON.parse
        subjects: t.subjects, // native array, no JSON.parse
        classSubjects: t.classSubjects, // native array, no JSON.parse
        salaryPayments,
        user,
        createdAt: fromTimestamp(t.createdAt),
        updatedAt: fromTimestamp(t.updatedAt),
      });
    }

    // Filter by className if provided
    if (className) {
      result = result.filter((t) => Array.isArray(t.classes) && t.classes.includes(className));
    }

    // Sort by createdAt descending (replacing Firestore orderBy)
    result.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

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
    const existingUserSnapshot = await getDb().collection('users')
      .where('username', '==', username)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = hashSync(password, 10);

    // Create User first
    const userId = generateId();
    const now = toTimestamp(new Date());
    await getDb().collection('users').doc(userId).set({
      username,
      password: hashedPassword,
      role: 'TEACHER',
      name,
      createdAt: now,
      updatedAt: now,
    });

    // Create Teacher
    const teacherId = generateId();
    await getDb().collection('teachers').doc(teacherId).set({
      userId,
      name,
      classes: classes || [], // native array, no JSON.stringify
      subjects: subjects || [], // native array, no JSON.stringify
      classSubjects: body.classSubjects || [], // native array of objects
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created teacher with salaryPayments and user
    const salarySnapshot = await getDb().collection('salaryPayments')
      .where('teacherId', '==', teacherId)
      .get();
    const salaryPayments = salarySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      paidAt: fromTimestamp(doc.data().paidAt),
      createdAt: fromTimestamp(doc.data().createdAt),
    })).sort((a, b) => a.year - b.year || a.month - b.month);

    const userDoc = await getDb().collection('users').doc(userId).get();
    const user = userDoc.exists
      ? { id: userDoc.id, username: userDoc.data()!.username, role: userDoc.data()!.role, name: userDoc.data()!.name }
      : null;

    notifyDataChange('teachers', 'create', teacherId);

    return NextResponse.json(
      {
        id: teacherId,
        userId,
        name,
        classes: classes || [],
        subjects: subjects || [],
        classSubjects: body.classSubjects || [],
        salaryPayments,
        user,
        createdAt: null, // server timestamp not yet resolved
        updatedAt: null,
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
