import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashSync } from 'bcryptjs';

export async function GET() {
  try {
    const admin = await db.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (admin) {
      return NextResponse.json({
        initialized: true,
        message: 'Admin already exists',
      });
    }

    const hashedPassword = hashSync('Shobhit@1502', 10);

    const newAdmin = await db.user.create({
      data: {
        username: 'shobhit',
        password: hashedPassword,
        role: 'ADMIN',
        name: 'Shobhit',
      },
    });

    return NextResponse.json({
      initialized: true,
      message: 'Default admin created',
      user: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role,
        name: newAdmin.name,
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
