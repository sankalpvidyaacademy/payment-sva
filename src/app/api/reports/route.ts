import { NextRequest, NextResponse } from 'next/server';
import { getDb, fromTimestamp } from '@/lib/firebase-admin';

// Academic session months in order: April(4) through March(3)
const SESSION_MONTHS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

// Get the session year for a given date
// If month is Jan-Mar (1-3), the session started in the previous year
function getSessionYear(month: number, year: number): number {
  if (month >= 1 && month <= 3) {
    return year - 1;
  }
  return year;
}

// Get all months in a session starting from April of sessionYear to March of sessionYear+1
function getSessionMonths(sessionYear: number): Array<{ month: number; year: number }> {
  return SESSION_MONTHS.map((m) => ({
    month: m,
    year: m >= 4 ? sessionYear : sessionYear + 1,
  }));
}

// Helper: fetch a student document by ID with subjectFees and monthlyFeeDistributions
async function fetchStudentWithRelations(studentId: string) {
  const studentDoc = await getDb().collection('students').doc(studentId).get();
  if (!studentDoc.exists) return null;
  const studentData = studentDoc.data()!;

  // Fetch subjectFees sub-collection for this student
  const subjectFeesSnapshot = await getDb().collection('subjectFees')
    .where('studentId', '==', studentId)
    .get();
  const subjectFees = subjectFeesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Fetch monthlyFeeDistributions sub-collection for this student
  const monthlyFeeDistributionsSnapshot = await getDb().collection('monthlyFeeDistributions')
    .where('studentId', '==', studentId)
    .get();
  const monthlyFeeDistributions = monthlyFeeDistributionsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return {
    id: studentDoc.id,
    monthlyFee: studentData.monthlyFee,
    totalYearlyFee: studentData.totalYearlyFee,
    coachingFee: studentData.coachingFee,
    subjects: studentData.subjects, // native array
    subjectFees,
    monthlyFeeDistributions,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'monthly') {
      return await getMonthlyReport(searchParams);
    } else if (type === 'yearly') {
      return await getYearlyReport(searchParams);
    } else if (type === 'pending-fees') {
      return await getPendingFeesReport(searchParams);
    } else {
      return NextResponse.json(
        { error: 'Invalid report type. Use: monthly, yearly, or pending-fees' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getMonthlyReport(searchParams: URLSearchParams) {
  const month = parseInt(searchParams.get('month') || '0');
  const year = parseInt(searchParams.get('year') || '0');

  if (!month || !year) {
    return NextResponse.json(
      { error: 'month and year are required for monthly report' },
      { status: 400 }
    );
  }

  // Total fees received for this month
  const feePaymentsSnapshot = await getDb().collection('feePayments')
    .where('month', '==', month)
    .where('year', '==', year)
    .get();

  const feePayments = feePaymentsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Fetch student data for each feePayment
  const feePaymentsWithStudent = [];
  for (const fp of feePayments) {
    const student = await fetchStudentWithRelations(fp.studentId);
    feePaymentsWithStudent.push({
      ...fp,
      student: student || {
        id: fp.studentId,
        monthlyFee: 0,
        totalYearlyFee: 0,
        coachingFee: 0,
        subjects: [],
        subjectFees: [],
        monthlyFeeDistributions: [],
      },
    });
  }

  // Calculate total income with subject fees + coaching fees breakdown
  let totalSubjectFees = 0;
  let totalCoachingFees = 0;

  feePaymentsWithStudent.forEach((fp) => {
    const student = fp.student;
    // Calculate this student's total yearly subject fees
    const studentSubjectTotal = student.subjectFees.reduce(
      (sum: number, sf: { yearlyFee: number }) => sum + sf.yearlyFee,
      0
    );
    // Calculate this student's coaching fee
    const studentCoachingFee = student.coachingFee || 0;
    // Total yearly fee for this student
    const studentTotalYearly = student.totalYearlyFee || 1; // avoid div by zero

    // Proportion of this payment that is subject fees vs coaching fees
    const subjectRatio = studentSubjectTotal / studentTotalYearly;
    const coachingRatio = studentCoachingFee / studentTotalYearly;

    totalSubjectFees += Math.round(fp.amountPaid * subjectRatio);
    totalCoachingFees += Math.round(fp.amountPaid * coachingRatio);
  });

  const totalFeesReceived = feePaymentsWithStudent.reduce(
    (sum, fp) => sum + fp.amountPaid,
    0
  );

  // Total expenses for this month
  const expensesSnapshot = await getDb().collection('expenses')
    .where('month', '==', month)
    .where('year', '==', year)
    .get();
  const expenses = expensesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const totalExpenses = expenses.reduce((sum, e) => sum + (e as { amount: number }).amount, 0);

  // Total salary paid for this month
  const salaryPaymentsSnapshot = await getDb().collection('salaryPayments')
    .where('month', '==', month)
    .where('year', '==', year)
    .get();
  const salaryPayments = salaryPaymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const totalSalaryPaid = salaryPayments.reduce(
    (sum, sp) => sum + (sp as { amount: number }).amount,
    0
  );

  const profitLoss = totalFeesReceived - totalExpenses - totalSalaryPaid;

  return NextResponse.json({
    type: 'monthly',
    month,
    year,
    totalFeesReceived,
    totalSubjectFees,
    totalCoachingFees,
    totalExpenses,
    totalSalaryPaid,
    profitLoss,
    feePaymentCount: feePaymentsWithStudent.length,
    expenseCount: expenses.length,
    salaryPaymentCount: salaryPayments.length,
  });
}

async function getYearlyReport(searchParams: URLSearchParams) {
  const year = parseInt(searchParams.get('year') || '0');

  if (!year) {
    return NextResponse.json(
      { error: 'year is required for yearly report' },
      { status: 400 }
    );
  }

  // Session: April(year) to March(year+1)
  const sessionMonths = getSessionMonths(year);

  // Aggregate data for all months in the session
  let totalFeesReceived = 0;
  let totalSubjectFees = 0;
  let totalCoachingFees = 0;
  let totalExpenses = 0;
  let totalSalaryPaid = 0;

  const monthlyBreakdown = [];

  for (const { month, year: y } of sessionMonths) {
    const feePaymentsSnapshot = await getDb().collection('feePayments')
      .where('month', '==', month)
      .where('year', '==', y)
      .get();

    const feePayments = feePaymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch student data for each feePayment
    const feePaymentsWithStudent = [];
    for (const fp of feePayments) {
      const student = await fetchStudentWithRelations(fp.studentId);
      feePaymentsWithStudent.push({
        ...fp,
        student: student || {
          id: fp.studentId,
          monthlyFee: 0,
          totalYearlyFee: 0,
          coachingFee: 0,
          subjects: [],
          subjectFees: [],
          monthlyFeeDistributions: [],
        },
      });
    }

    const monthFees = feePaymentsWithStudent.reduce((sum, fp) => sum + fp.amountPaid, 0);

    // Calculate subject fees + coaching fees breakdown for this month
    let monthSubjectFees = 0;
    let monthCoachingFees = 0;
    feePaymentsWithStudent.forEach((fp) => {
      const student = fp.student;
      const studentSubjectTotal = student.subjectFees.reduce(
        (sum: number, sf: { yearlyFee: number }) => sum + sf.yearlyFee,
        0
      );
      const studentCoachingFee = student.coachingFee || 0;
      const studentTotalYearly = student.totalYearlyFee || 1;
      const subjectRatio = studentSubjectTotal / studentTotalYearly;
      const coachingRatio = studentCoachingFee / studentTotalYearly;
      monthSubjectFees += Math.round(fp.amountPaid * subjectRatio);
      monthCoachingFees += Math.round(fp.amountPaid * coachingRatio);
    });

    const expensesSnapshot = await getDb().collection('expenses')
      .where('month', '==', month)
      .where('year', '==', y)
      .get();
    const expenses = expensesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const monthExpenses = expenses.reduce((sum, e) => sum + (e as { amount: number }).amount, 0);

    const salaryPaymentsSnapshot = await getDb().collection('salaryPayments')
      .where('month', '==', month)
      .where('year', '==', y)
      .get();
    const salaryPayments = salaryPaymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const monthSalary = salaryPayments.reduce(
      (sum, sp) => sum + (sp as { amount: number }).amount,
      0
    );

    totalFeesReceived += monthFees;
    totalSubjectFees += monthSubjectFees;
    totalCoachingFees += monthCoachingFees;
    totalExpenses += monthExpenses;
    totalSalaryPaid += monthSalary;

    const monthNames = [
      '', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    monthlyBreakdown.push({
      month,
      year: y,
      monthName: monthNames[month],
      fees: monthFees,
      subjectFees: monthSubjectFees,
      coachingFees: monthCoachingFees,
      expenses: monthExpenses,
      salary: monthSalary,
      profitLoss: monthFees - monthExpenses - monthSalary,
    });
  }

  const profitLoss = totalFeesReceived - totalExpenses - totalSalaryPaid;

  return NextResponse.json({
    type: 'yearly',
    sessionYear: year,
    sessionLabel: `${year}-${(year + 1) % 100}`,
    totalFeesReceived,
    totalSubjectFees,
    totalCoachingFees,
    totalExpenses,
    totalSalaryPaid,
    profitLoss,
    monthlyBreakdown,
  });
}

async function getPendingFeesReport(searchParams: URLSearchParams) {
  const yearParam = searchParams.get('year');
  const now = new Date();
  const currentSessionYear = yearParam
    ? parseInt(yearParam)
    : getSessionYear(now.getMonth() + 1, now.getFullYear());

  const sessionMonths = getSessionMonths(currentSessionYear);

  // Get all students
  const studentsSnapshot = await getDb().collection('students')
    .get();

  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const result = [];

  for (const studentDoc of studentsSnapshot.docs) {
    const studentData = studentDoc.data();
    const studentId = studentDoc.id;

    // Fetch subjectFees for this student
    const subjectFeesSnapshot = await getDb().collection('subjectFees')
      .where('studentId', '==', studentId)
      .get();
    const subjectFees = subjectFeesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Fetch feePayments for this student in this session
    const allFeePaymentsSnapshot = await getDb().collection('feePayments')
      .where('studentId', '==', studentId)
      .get();
    const allFeePayments = allFeePaymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter feePayments to only this session's months
    const sessionMonthKeys = new Set(
      sessionMonths.map(({ month, year }) => `${month}-${year}`)
    );
    const feePayments = allFeePayments.filter(
      (fp) => sessionMonthKeys.has(`${fp.month}-${fp.year}`)
    );

    // Fetch monthlyFeeDistributions for this student
    const monthlyFeeDistributionsSnapshot = await getDb().collection('monthlyFeeDistributions')
      .where('studentId', '==', studentId)
      .get();
    const monthlyFeeDistributions = monthlyFeeDistributionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Build the student object matching the original Prisma shape
    const student = {
      id: studentId,
      name: studentData.name,
      className: studentData.className,
      subjects: studentData.subjects, // native array — NO JSON.parse
      monthlyFee: studentData.monthlyFee,
      totalYearlyFee: studentData.totalYearlyFee,
      coachingFee: studentData.coachingFee,
      subjectFees,
      feePayments,
      monthlyFeeDistributions,
    };

    const monthlyData: Record<
      string,
      {
        month: number;
        year: number;
        amountDue: number;
        amountPaid: number;
        status: string;
        colorCode: string;
        paidAt: string | null;
      }
    > = {};

    // Calculate carry-forward adjustments for each month
    let carryForward = 0;

    for (const { month, year } of sessionMonths) {
      const key = `${month}-${year}`;
      const payment = student.feePayments.find(
        (fp) => fp.month === month && fp.year === year
      );

      // Use monthlyFeeDistribution amount if available, fall back to monthlyFee
      const distribution = student.monthlyFeeDistributions.find(
        (d) => d.month === month && d.year === year
      );
      const baseDue = distribution ? distribution.amount : student.monthlyFee;

      // Zero fee month: skip entirely (blank in UI)
      if (baseDue === 0 && !payment) {
        monthlyData[key] = {
          month,
          year,
          amountDue: 0,
          amountPaid: 0,
          status: 'none',
          colorCode: 'gray',
          paidAt: null,
        };
        continue;
      }

      let amountDue: number;
      let amountPaid: number;
      let paidAt: Date | null;

      if (payment && payment.paidAt) {
        // This month has been paid - use its amountDue (includes carry-forward)
        amountDue = payment.amountDue;
        amountPaid = payment.amountPaid;
        paidAt = payment.paidAt instanceof Date ? payment.paidAt : new Date(fromTimestamp(payment.paidAt) || '');

        // Update carry-forward for next months
        const difference = amountPaid - amountDue;
        carryForward += difference;
      } else {
        // Unpaid month: apply carry-forward from previous months
        amountDue = Math.max(0, baseDue - carryForward);
        amountPaid = 0;
        paidAt = null;

        // Reset carry-forward since it's been applied to this month's due
        // (If this month remains unpaid, the carry-forward is "absorbed" into its due)
        // The carry-forward was from overpayments in previous months reducing this month's due
        // If there was underpayment, it increases this month's due
        carryForward = 0;
      }

      let status: string;
      let colorCode: string;

      if (amountDue === 0 && amountPaid === 0) {
        // Zero fee after adjustment - show as blank
        status = 'none';
        colorCode = 'gray';
      } else if (amountPaid === 0) {
        status = 'unpaid';
        colorCode = 'red';
      } else if (amountPaid >= amountDue) {
        status = 'paid';
        colorCode = 'green';
      } else {
        status = 'partial';
        colorCode = 'gray'; // Partial paid = gray
      }

      monthlyData[key] = {
        month,
        year,
        amountDue,
        amountPaid,
        status,
        colorCode,
        paidAt: paidAt ? (paidAt instanceof Date ? paidAt.toISOString() : String(paidAt)) : null,
      };
    }

    result.push({
      id: student.id,
      name: student.name,
      className: student.className,
      subjects: student.subjects,
      monthlyFee: student.monthlyFee,
      totalYearlyFee: student.totalYearlyFee,
      monthlyData,
    });
  }

  // Sort by className ascending (replacing Firestore orderBy)
  result.sort((a, b) => a.className.localeCompare(b.className));

  return NextResponse.json({
    type: 'pending-fees',
    sessionYear: currentSessionYear,
    sessionLabel: `${currentSessionYear}-${(currentSessionYear + 1) % 100}`,
    sessionMonths: sessionMonths.map(({ month, year }) => ({
      month,
      year,
      monthName: monthNames[month],
    })),
    students: result,
  });
}
