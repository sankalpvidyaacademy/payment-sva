# Task 4-5: Migrate Auth & Student API Routes from Prisma to Firebase Firestore

## Agent: Firebase Migration Agent
## Task ID: 4-5

---

## Summary

Migrated 4 API route files from Prisma/SQLite to Firebase Firestore, replacing `import { db } from '@/lib/db'` with `import { getDb, generateId, toTimestamp, fromTimestamp, serverTimestamp, admin } from '@/lib/firebase-admin'`, and adding `notifyDataChange()` calls after data mutations in student routes.

---

## Files Modified

### 1. `/src/app/api/auth/route.ts` (Login + Change Password)

**Changes:**
- Replaced `db.user.findUnique({ where: { username } })` with Firestore query: `getDb().collection('users').where('username', '==', username).get()`
- Replaced `db.user.findUnique({ where: { id } })` with `getDb().collection('users').doc(userId).get()`
- Replaced `db.user.update({ where: { id }, data })` with `getDb().collection('users').doc(userId).update(data)`
- Response format preserved exactly: `{ id, username, role, name }` for login, `{ message }` for password change
- No `notifyDataChange` needed (auth routes don't need cross-panel sync)

### 2. `/src/app/api/auth/init/route.ts` (Auto-create Admin)

**Changes:**
- Replaced `db.user.findFirst({ where: { role: 'ADMIN' } })` with `getDb().collection('users').where('role', '==', 'ADMIN').limit(1).get()`
- Replaced `db.user.create({ data })` with `getDb().collection('users').doc(id).set(data)` using `generateId()` for the document ID
- Added `createdAt` and `updatedAt` fields using `toTimestamp(new Date())` (Prisma auto-generated these)
- No `notifyDataChange` needed

### 3. `/src/app/api/students/route.ts` (GET/POST/PUT)

**GET Handler:**
- Replaced `db.student.findMany({ include: {...}, orderBy })` with manual Firestore queries
- Fetches all students with `getDb().collection('students').orderBy('createdAt', 'desc').get()`
- Filters by `className` in memory (avoids composite index requirement)
- For each student, fetches `subjectFees`, `feePayments`, `monthlyFeeDistributions`, and `user` in parallel using `Promise.all`
- `subjects` returned as native array (no `JSON.parse` needed — Firestore stores it natively)
- `feePayments` and `monthlyFeeDistributions` sorted by `year asc, month asc` after fetch
- All Firestore Timestamps converted to ISO strings using `fromTimestamp()`

**POST Handler:**
- Uses Firestore batch write for atomicity (user + student + subjectFees + monthlyFeeDistributions all in one batch)
- Generates IDs with `generateId()` instead of Prisma auto-cuid
- `subjects` stored as native array (no `JSON.stringify`)
- `dob` converted using `toTimestamp()`
- Calls `notifyDataChange('students', 'create', studentId)` after success
- Response constructed manually to match Prisma response format exactly

**PUT Handler:**
- Fetches existing student with `getDb().collection('students').doc(id).get()`
- Updates user fields with `update()` if name/username/password changed
- Updates student fields with `update()`, including `updatedAt` timestamp
- `subjects` updated as native array (no `JSON.stringify`)
- For subjectFees/monthlyFeeDistributions: queries existing docs, deletes them, and creates new ones in a single batch
- After update, re-fetches all data to build complete response (ensures consistency)
- Calls `notifyDataChange('students', 'update', id)` after success

### 4. `/src/app/api/students/[id]/route.ts` (GET/DELETE)

**GET Handler:**
- Fetches student doc, then fetches all sub-collections and user in parallel
- Same response format as list endpoint for single student
- `subjects` returned as native array

**DELETE Handler:**
- Fetches student, then queries all related sub-collections in parallel
- Uses a single Firestore batch to delete: user + subjectFees + feePayments + monthlyFeeDistributions + student
- Calls `notifyDataChange('students', 'delete', id)` after success

---

## Key Migration Patterns Applied

| Prisma Pattern | Firestore Equivalent |
|---|---|
| `db.user.findUnique({ where: { username } })` | `getDb().collection('users').where('username', '==', username).get()` |
| `db.user.findUnique({ where: { id } })` | `getDb().collection('users').doc(id).get()` |
| `db.user.findFirst({ where: { role } })` | `getDb().collection('users').where('role', '==', 'ADMIN').limit(1).get()` |
| `db.user.create({ data })` | `getDb().collection('users').doc(id).set(data)` with `generateId()` |
| `db.user.update({ where, data })` | `getDb().collection('users').doc(id).update(data)` |
| `db.user.delete({ where })` | `getDb().collection('users').doc(id).delete()` |
| `db.student.findMany({ include, orderBy })` | Manual fetch + parallel sub-queries + in-memory sort/filter |
| `db.subjectFee.deleteMany({ where })` | Query + batch delete each doc |
| `JSON.parse(s.subjects)` | `data.subjects` (native array in Firestore) |
| `JSON.stringify(subjects)` | `subjects` (stored as native array) |
| Auto-generated `cuid()` | `generateId()` |
| Prisma `@updatedAt` | Explicit `toTimestamp(new Date())` |
| JS `Date` objects | Firestore `Timestamp` (convert with `toTimestamp`/`fromTimestamp`) |
| Prisma `include` relations | Manual `where('studentId', '==', id)` queries on sub-collections |
| Cascading deletes | Manual batch delete of all related docs |

---

## Lint Status
- All 4 rewritten files pass ESLint clean
- Pre-existing lint warnings in `firebase-admin.ts` and `realtime-notify.ts` (require imports) — not introduced by this task
