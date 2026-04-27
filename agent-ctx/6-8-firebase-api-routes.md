# Task 6-8: Migrate 5 API Routes from Prisma/SQLite to Firebase Firestore

## Summary
Rewrote 5 API route files, replacing Prisma ORM calls with Firebase Admin SDK Firestore operations. All business logic preserved exactly, especially the carry-forward logic in fees.

## Files Modified

### 1. `/src/app/api/teachers/route.ts`
- **GET**: Fetches all teachers from Firestore `teachers` collection with `orderBy('createdAt', 'desc')`, then for each teacher fetches `salaryPayments` via `where('teacherId', '==', id)` and `users` by doc ID. `classes`, `subjects`, `classSubjects` returned as native arrays (no JSON.parse). Supports `className` filter in-memory after fetch.
- **POST**: Generates IDs with `generateId()`, creates user doc then teacher doc. `classes`, `subjects`, `classSubjects` stored as native arrays (no JSON.stringify). Calls `notifyDataChange('teachers', 'create', teacherId)`.
- **PUT**: Checks existing teacher/user, updates user if needed, updates teacher. `classes/subjects/classSubjects` as native arrays. Calls `notifyDataChange('teachers', 'update', id)`.

### 2. `/src/app/api/teachers/[id]/route.ts`
- **GET**: Single teacher fetch with salaryPayments and user. Returns native arrays.
- **DELETE**: Deletes all related salaryPayments first, then teacher doc, then user doc. Calls `notifyDataChange('teachers', 'delete', id)`.

### 3. `/src/app/api/fees/route.ts`
- **GET**: Builds Firestore query with optional `studentId`, `month`, `year` filters. For each feePayment, fetches student data. `student.subjects` is native array.
- **POST**: Carry-forward logic preserved EXACTLY as-is. Replaced `db.student.findUnique` with Firestore fetch of student + monthlyFeeDistributions. Replaced `db.feePayment.findFirst` with Firestore `where()` query. Replaced `db.feePayment.update/create` with Firestore `update/set`. The `calculateCarryForward` function uses Firestore query instead of Prisma. All math unchanged. Calls `notifyDataChange('feePayments', 'create')`.

### 4. `/src/app/api/fees/[id]/route.ts`
- **GET**: Single fee payment with student info. `student.subjects` returned as native array.

### 5. `/src/app/api/salary/route.ts`
- **GET**: List salary payments with optional `teacherId` filter. Fetches teacher info for each. `teacher.classes`, `teacher.subjects` as native arrays.
- **POST**: Creates salary payment with `generateId()`. Calls `notifyDataChange('salaryPayments', 'create')`.

## Key Changes from Prisma to Firebase
1. `import { db } from '@/lib/db'` → `import { getDb, generateId, toTimestamp, fromTimestamp, serverTimestamp } from '@/lib/firebase-admin'`
2. Added `import { notifyDataChange } from '@/lib/realtime-notify'` and calls after each mutation
3. `db.teacher.findMany()` → `getDb().collection('teachers').get()` with map
4. `db.teacher.findUnique({ where: { id } })` → `getDb().collection('teachers').doc(id).get()`
5. `db.user.findUnique({ where: { username } })` → `getDb().collection('users').where('username', '==', username).limit(1).get()`
6. `db.teacher.create({ data })` → `getDb().collection('teachers').doc(id).set(data)`
7. `db.teacher.update({ where: { id }, data })` → `getDb().collection('teachers').doc(id).update(data)`
8. `db.user.delete({ where: { id } })` → `getDb().collection('users').doc(id).delete()`
9. JSON.parse/JSON.stringify removed — arrays stored natively in Firestore
10. Dates: `new Date()` → `toTimestamp(new Date())` for writes, `fromTimestamp(ts)` for reads
11. `serverTimestamp()` used for createdAt/updatedAt on new documents
12. No Prisma relations — manual sub-collection fetches with `where()`
13. Cascade deletes handled manually (e.g., deleting salaryPayments before teacher)

## Lint Status
All 5 route files pass lint. Pre-existing lint errors in shared library files (firebase-admin.ts, realtime-notify.ts) are not part of this task.
