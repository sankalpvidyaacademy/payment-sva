import { NextResponse } from 'next/server';
import { getDb, generateId, toTimestamp } from '@/lib/firebase-admin';
import { hashSync } from 'bcryptjs';

export async function GET() {
  try {
    const snapshot = await getDb()
      .collection('users')
      .where('role', '==', 'ADMIN')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return NextResponse.json({
        initialized: true,
        message: 'Admin already exists',
      });
    }

    const hashedPassword = hashSync('Shobhit@1502', 10);
    const id = generateId();
    const now = toTimestamp(new Date())!;

    await getDb().collection('users').doc(id).set({
      username: 'shobhit',
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Shobhit',
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      initialized: true,
      message: 'Default admin created',
      user: {
        id,
        username: 'shobhit',
        role: 'ADMIN',
        name: 'Shobhit',
      },
    });
  } catch (error) {
    console.error('Init error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
