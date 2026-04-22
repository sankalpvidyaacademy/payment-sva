'use client'

import { useAppStore } from '@/lib/store'
import Login from '@/components/login'
import AppLayout from '@/components/app-layout'
import { AdminDashboard } from '@/components/admin-dashboard'
import { StudentManagement } from '@/components/student-management'
import { TeacherManagement } from '@/components/teacher-management'
import { FeeCollection } from '@/components/fee-collection'
import { SalaryManagement } from '@/components/salary-management'
import { ExpensesManagement } from '@/components/expenses-management'
import Reports from '@/components/reports'
import PendingFees from '@/components/pending-fees'
import TeacherPanel from '@/components/teacher-panel'
import StudentPanel from '@/components/student-panel'
import Profile from '@/components/profile'

function AdminViews({ view }: { view: string }) {
  switch (view) {
    case 'dashboard':
      return <AdminDashboard />
    case 'students':
      return <StudentManagement />
    case 'teachers':
      return <TeacherManagement />
    case 'fees':
      return <FeeCollection />
    case 'salary':
      return <SalaryManagement />
    case 'expenses':
      return <ExpensesManagement />
    case 'reports':
      return <Reports />
    case 'pending-fees':
      return <PendingFees />
    case 'profile':
      return <Profile />
    default:
      return <AdminDashboard />
  }
}

export default function Home() {
  const { user, adminView, teacherView, studentView } = useAppStore()

  if (!user) {
    return <Login />
  }

  const currentView = user.role === 'ADMIN'
    ? adminView
    : user.role === 'TEACHER'
    ? teacherView
    : studentView

  return (
    <AppLayout>
      {user.role === 'ADMIN' && <AdminViews view={currentView} />}
      {user.role === 'TEACHER' && <TeacherPanel />}
      {user.role === 'STUDENT' && <StudentPanel />}
    </AppLayout>
  )
}
