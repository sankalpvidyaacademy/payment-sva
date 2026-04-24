# Sankalp Vidya Academy - Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix carry-forward sign bug across all files

Work Log:
- Identified critical bug: carry-forward sign was inverted - overpayment INCREASED next month instead of DECREASING
- Fixed `src/app/api/fees/route.ts`: Changed `baseDue + carryForward` → `baseDue - carryForward` in calculateCarryForward (line 85) and POST handler (line 153)
- Fixed `src/app/api/fees/route.ts`: Changed `nextPayment.amountDue + difference` → `nextPayment.amountDue - difference` for next month adjustment (line 231)
- Fixed `src/app/api/reports/route.ts`: Changed `baseDue + carryForward` → `baseDue - carryForward` in getPendingFeesReport (line 263)
- Fixed `src/components/fee-collection.tsx`: Changed `baseFee + carryForward` → `baseFee - carryForward` in getAdjustedMonthData (line 333)

Stage Summary:
- Carry-forward sign bug fixed across all 3 files (5 locations)
- Now: overpayment REDUCES next month due, underpayment INCREASES next month due ✓

---
Task ID: 2
Agent: Main Agent
Task: Fix fee slip remaining fee, zero fee display, and add triggerRefresh

Work Log:
- Added `import { useAppStore } from '@/lib/store'` and `triggerRefresh()` call after fee payment
- Fixed fee slip remaining fee to include current payment: `Math.max(0, totalYearlyFee - getTotalPaid - lastPayment.amountPaid)`
- Fixed zero fee months in screen version to show blank instead of "-"
- Fixed `currentMonthDue` to use `getAdjustedMonthData()` for carry-forward adjusted amounts

Stage Summary:
- Fee slip now shows correct remaining fee after payment ✓
- Other components (teacher dashboard, pending fees) auto-refresh after fee payment ✓
- Zero fee months display as blank ✓
- Payment dialog shows carry-forward adjusted due ✓

---
Task ID: 3
Agent: Main Agent
Task: Add A4 Salary Slip and improve Salary Management UI

Work Log:
- Added A4-printable salary slip to salary-management.tsx with header, teacher details, earning details, payment details, and director signature footer
- Added `printSalarySlip()` function for A4 print window
- Added `printViewSalarySlip()` function for past payment slips
- Added View Slip button in salary history (desktop + mobile)
- Added View Past Salary Slip dialog with A4 print support
- Replaced simple success dialog with comprehensive salary slip dialog

Stage Summary:
- Professional A4 salary slip added to Salary Management ✓
- View/print past salary slips from history ✓
- Success dialog shows full salary slip with Print button ✓

---
Task ID: 4
Agent: Main Agent
Task: Improve Teacher Dashboard UI

Work Log:
- Replaced 3-card grid with 4-card layout (Total Earning, Received, Remaining, Monthly Salary)
- Added left-border accents on cards for visual hierarchy
- Added Salary Collection Progress bar with percentage
- Improved Monthly Salary Status with current month highlight, brand-colored pulsing dot
- Added Student Contribution section with subject-wise fees and coaching share
- Added A4 salary slip to teacher salary view with print function
- Added Print button to salary history table
- Improved responsive grid: 1 col mobile → 2 col sm → 4 col lg

Stage Summary:
- Teacher dashboard significantly improved with 4-card layout, progress bar, student contribution ✓
- A4 salary slip with director signature added to teacher salary view ✓
- Mobile-friendly responsive design ✓

---
Task ID: 5
Agent: Main Agent
Task: Fix Teacher Earning Bug - Remove coaching fee from calculation

Work Log:
- Identified bug: coaching fee was being included in teacher total yearly earning calculation
- Example: 2 students with Math(₹8000) + Physics(₹8500) = ₹16,500, but coaching fee added ₹5,833 → showing ₹22,333 incorrectly
- Fixed `src/components/salary-management.tsx`: Removed coachingShare from totalYearlyEarning calculation - now only sums subjectFeeTotal
- Fixed `src/components/teacher-panel.tsx`: Removed coachingShare from totalYearlyEarning calculation (2 places)
- Fixed `src/components/teacher-panel.tsx`: Removed coachingShare from studentContributions object and display
- Removed Coaching badge display from Student Contribution section

Stage Summary:
- Teacher Total Yearly Earning now = Sum of Subject Fees ONLY (no coaching fee) ✓
- Example: Math ₹8000 + Physics ₹8500 = ₹16,500 (correct, no coaching fee) ✓

---
Task ID: 6
Agent: Main Agent
Task: Fix Fee Payment client-side error - Pay button crash

Work Log:
- Identified root cause: `getAdjustedMonthData` was used at line 305 but declared at line 316, and it depended on `sessionYear` which was declared at line 311 (after the call)
- Fixed by reordering declarations: moved `sessionYear`, `studentPayments`, and `getAdjustedMonthData` BEFORE `currentMonthFee`/`currentMonthPaid`/`currentMonthDue`
- Added try-catch safety wrapper around `currentMonthDue` calculation with fallback to simple calculation
- Improved error handling in `confirmPayFee`: added try-catch around `res.json()` on error response to prevent crash on non-JSON responses
- Added `Math.max(0, ...)` wrapper on `currentMonthDue` result to prevent negative values

Stage Summary:
- Fixed variable declaration order (sessionYear → getAdjustedMonthData → currentMonthDue) ✓
- Added error safety in payment flow ✓
- Pay button should now work without crashing ✓
