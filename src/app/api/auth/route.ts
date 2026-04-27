import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase-admin';
import { compareSync, hashSync } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const snapshot = await getDb()
      .collection('users')
      .where('username', '==', username)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (!compareSync(password, userData.password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: userDoc.id,
      username: userData.username,
      role: userData.role,
      name: userData.name,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();

    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'userId, oldPassword, and newPassword are required' },
        { status: 400 }
      );
    }

    const userDoc = await getDb().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;

    if (!compareSync(oldPassword, userData.password)) {
      return NextResponse.json(
        { error: 'Old password is incorrect' },
        { status: 401 }
      );
    }

    const hashedPassword = hashSync(newPassword, 10);

    await getDb().collection('users').doc(userId).update({
      password: hashedPassword,
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
