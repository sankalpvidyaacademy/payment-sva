import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, AdminView, TeacherView, StudentView } from './types'

interface AppState {
  // Auth
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  
  // Navigation
  adminView: AdminView
  setAdminView: (view: AdminView) => void
  teacherView: TeacherView
  setTeacherView: (view: TeacherView) => void
  studentView: StudentView
  setStudentView: (view: StudentView) => void
  
  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  
  // Refresh triggers
  refreshKey: number
  triggerRefresh: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      
      adminView: 'dashboard',
      setAdminView: (view) => set({ adminView: view, sidebarOpen: false }),
      teacherView: 'dashboard',
      setTeacherView: (view) => set({ teacherView: view, sidebarOpen: false }),
      studentView: 'dashboard',
      setStudentView: (view) => set({ studentView: view, sidebarOpen: false }),
      
      sidebarOpen: false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      refreshKey: 0,
      triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
    }),
    {
      name: 'sankalp-vidya-store',
      partialize: (state) => ({
        user: state.user,
        adminView: state.adminView,
        teacherView: state.teacherView,
        studentView: state.studentView,
      }),
    }
  )
)
