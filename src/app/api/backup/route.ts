import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const users = await db.user.findMany();
    const students = await db.student.findMany({
      include: { subjectFees: true, monthlyFeeDistributions: true },
    });
    const subjectFees = await db.subjectFee.findMany();
    const feePayments = await db.feePayment.findMany();
    const monthlyFeeDistributions = await db.monthlyFeeDistribution.findMany();
    const teachers = await db.teacher.findMany();
    const salaryPayments = await db.salaryPayment.findMany();
    const expenses = await db.expense.findMany();

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

    // Clear all tables in reverse dependency order
    await db.salaryPayment.deleteMany();
    await db.feePayment.deleteMany();
    await db.monthlyFeeDistribution.deleteMany();
    await db.subjectFee.deleteMany();
    await db.expense.deleteMany();
    await db.student.deleteMany();
    await db.teacher.deleteMany();
    await db.user.deleteMany();

    // Reimport data in dependency order

    // 1. Users first (no dependencies)
    if (data.users && Array.isArray(data.users)) {
      for (const user of data.users) {
        await db.user.create({
          data: {
            id: user.id,
            username: user.username,
            password: user.password,
            role: user.role,
            name: user.name,
            createdAt: new Date(user.createdAt),
            updatedAt: new Date(user.updatedAt),
          },
        });
      }
    }

    // 2. Students (depends on User)
    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        await db.student.create({
          data: {
            id: student.id,
            userId: student.userId,
            name: student.name,
            dob: student.dob ? new Date(student.dob) : null,
            className: student.className,
            subjects: student.subjects,
            totalYearlyFee: student.totalYearlyFee,
            coachingFee: student.coachingFee,
            monthlyFee: student.monthlyFee,
            createdAt: new Date(student.createdAt),
            updatedAt: new Date(student.updatedAt),
          },
        });
      }
    }

    // 3. SubjectFees (depends on Student)
    if (data.subjectFees && Array.isArray(data.subjectFees)) {
      for (const sf of data.subjectFees) {
        await db.subjectFee.create({
          data: {
            id: sf.id,
            studentId: sf.studentId,
            subject: sf.subject,
            yearlyFee: sf.yearlyFee,
          },
        });
      }
    }

    // 4. FeePayments (depends on Student)
    if (data.feePayments && Array.isArray(data.feePayments)) {
      for (const fp of data.feePayments) {
        await db.feePayment.create({
          data: {
            id: fp.id,
            studentId: fp.studentId,
            month: fp.month,
            year: fp.year,
            amountDue: fp.amountDue,
            amountPaid: fp.amountPaid,
            paymentMode: fp.paymentMode,
            slipNumber: fp.slipNumber,
            paidAt: fp.paidAt ? new Date(fp.paidAt) : null,
            createdAt: new Date(fp.createdAt),
          },
        });
      }
    }

    // 5. MonthlyFeeDistributions (depends on Student)
    if (data.monthlyFeeDistributions && Array.isArray(data.monthlyFeeDistributions)) {
      for (const mfd of data.monthlyFeeDistributions) {
        await db.monthlyFeeDistribution.create({
          data: {
            id: mfd.id,
            studentId: mfd.studentId,
            month: mfd.month,
            year: mfd.year,
            amount: mfd.amount,
          },
        });
      }
    }

    // 6. Teachers (depends on User)
    if (data.teachers && Array.isArray(data.teachers)) {
      for (const teacher of data.teachers) {
        await db.teacher.create({
          data: {
            id: teacher.id,
            userId: teacher.userId,
            name: teacher.name,
            classes: teacher.classes,
            subjects: teacher.subjects,
            createdAt: new Date(teacher.createdAt),
            updatedAt: new Date(teacher.updatedAt),
          },
        });
      }
    }

    // 7. SalaryPayments (depends on Teacher)
    if (data.salaryPayments && Array.isArray(data.salaryPayments)) {
      for (const sp of data.salaryPayments) {
        await db.salaryPayment.create({
          data: {
            id: sp.id,
            teacherId: sp.teacherId,
            month: sp.month,
            year: sp.year,
            totalYearlyEarning: sp.totalYearlyEarning,
            totalReceivedFees: sp.totalReceivedFees,
            amount: sp.amount,
            paymentMode: sp.paymentMode,
            paidAt: new Date(sp.paidAt),
            createdAt: new Date(sp.createdAt),
          },
        });
      }
    }

    // 8. Expenses (no dependencies)
    if (data.expenses && Array.isArray(data.expenses)) {
      for (const expense of data.expenses) {
        await db.expense.create({
          data: {
            id: expense.id,
            month: expense.month,
            year: expense.year,
            amount: expense.amount,
            purpose: expense.purpose,
            createdAt: new Date(expense.createdAt),
          },
        });
      }
    }

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
