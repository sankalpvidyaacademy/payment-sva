# Task 9-11: Migrate 3 API Routes from Prisma/SQLite to Firebase Firestore

## Task Summary
Rewrote 3 API route files replacing `import { db } from '@/lib/db'` (Prisma) with Firebase Admin SDK, and added `notifyDataChange()` calls after each data mutation.

## Files Rewritten

### 1. `/src/app/api/expenses/route.ts`
- **GET**: `getDb().collection('expenses').orderBy('createdAt', 'desc').get()` → filter by month/year in-memory → convert Timestamps with `fromTimestamp()`
- **POST**: `generateId()` → `getDb().collection('expenses').doc(id).set({...})` using `serverTimestamp()` → `notifyDataChange('expenses', 'create', id)`
- **DELETE**: Find doc → `docRef.delete()` → `notifyDataChange('expenses', 'delete', id)`

### 2. `/src/app/api/reports/route.ts` (most complex)
- **getMonthlyReport**: 
  - `getDb().collection('feePayments').where('month', '==', month).where('year', '==', year).get()`
  - For each feePayment, fetch student via `fetchStudentWithRelations()` helper (fetches student doc + subjectFees + monthlyFeeDistributions sub-collections)
  - Expenses/salary queries: `getDb().collection('expenses').where(...)` and `getDb().collection('salaryPayments').where(...)`
  - All calculation logic (subjectRatio, coachingRatio, profitLoss) preserved EXACTLY as-is

- **getYearlyReport**: Same pattern looping through session months, all aggregation logic preserved

- **getPendingFeesReport**:
  - `getDb().collection('students').orderBy('className', 'asc').get()`
  - For each student: fetch subjectFees, feePayments (filtered to session months in-memory), monthlyFeeDistributions
  - `student.subjects` is native array — NO JSON.parse
  - All carry-forward logic preserved EXACTLY: `baseDue - carryForward`, carryForward reset, color codes (green/gray/red)

### 3. `/src/app/api/backup/route.ts`
- **GET (export)**: `fetchCollection()` helper fetches all docs from 8 collections, converts Timestamps to ISO strings
- **POST (restore)**:
  - `clearCollection()` helper deletes all docs using batch writes (max 500 ops/batch)
  - Reimports in dependency order: users → students → subjectFees → feePayments → monthlyFeeDistributions → teachers → salaryPayments → expenses
  - `convertDateField()` helper converts ISO strings back to Firestore Timestamps via `toTimestamp()`
  - Native arrays (subjects, classes, classSubjects) passed directly — no JSON.stringify
  - `notifyDataChange('backup', 'update')` after success

## Key Migration Patterns Used
1. IDs: `generateId()` instead of Prisma auto-generated cuid
2. Dates: `toTimestamp()` for writes, `fromTimestamp()` for reads, `serverTimestamp()` for auto-fields
3. Arrays: Native arrays in Firestore (no JSON.parse/JSON.stringify for subjects, classes, classSubjects)
4. Relations: Manual `where()` queries on sub-collections instead of Prisma `include`
5. Realtime: `notifyDataChange()` after each mutation
6. Batch writes: Used in backup restore for efficiency (max 500 ops per batch)

## Lint Status
All 3 files pass ESLint cleanly (no new errors introduced).
