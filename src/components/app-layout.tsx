'use client'

import { useMemo } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  IndianRupee,
  Banknote,
  Receipt,
  BarChart3,
  ClipboardList,
  UserCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'
import type { UserRole, AdminView, TeacherView, StudentView } from '@/lib/types'

/* ------------------------------------------------------------------ */
/*  Navigation config per role                                         */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string
  icon: React.ElementType
  view: string
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Students', icon: GraduationCap, view: 'students' },
  { label: 'Teachers', icon: Users, view: 'teachers' },
  { label: 'Fees', icon: IndianRupee, view: 'fees' },
  { label: 'Salary', icon: Banknote, view: 'salary' },
  { label: 'Expenses', icon: Receipt, view: 'expenses' },
  { label: 'Reports', icon: BarChart3, view: 'reports' },
  { label: 'Pending Fees', icon: ClipboardList, view: 'pending-fees' },
  { label: 'Profile', icon: UserCircle, view: 'profile' },
]

const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Salary', icon: Banknote, view: 'salary' },
  { label: 'Students', icon: GraduationCap, view: 'students' },
  { label: 'Profile', icon: UserCircle, view: 'profile' },
]

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Fees', icon: IndianRupee, view: 'fees' },
  { label: 'Profile', icon: UserCircle, view: 'profile' },
]

const ADMIN_BOTTOM: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Fees', icon: IndianRupee, view: 'fees' },
  { label: 'Salary', icon: Banknote, view: 'salary' },
  { label: 'More', icon: MoreHorizontal, view: 'more' },
]

const TEACHER_BOTTOM: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Salary', icon: Banknote, view: 'salary' },
  { label: 'Profile', icon: UserCircle, view: 'profile' },
]

const STUDENT_BOTTOM: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Fees', icon: IndianRupee, view: 'fees' },
  { label: 'Profile', icon: UserCircle, view: 'profile' },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'ADMIN': return ADMIN_NAV
    case 'TEACHER': return TEACHER_NAV
    case 'STUDENT': return STUDENT_NAV
  }
}

function getBottomItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'ADMIN': return ADMIN_BOTTOM
    case 'TEACHER': return TEACHER_BOTTOM
    case 'STUDENT': return STUDENT_BOTTOM
  }
}

function getCurrentView(role: UserRole, store: { adminView: AdminView; teacherView: TeacherView; studentView: StudentView }): string {
  switch (role) {
    case 'ADMIN': return store.adminView
    case 'TEACHER': return store.teacherView
    case 'STUDENT': return store.studentView
  }
}

/* ------------------------------------------------------------------ */
/*  Sidebar nav items component (shared by mobile drawer & desktop)    */
/* ------------------------------------------------------------------ */

function SidebarNavItems({
  items,
  currentView,
  onNavigate,
}: {
  items: NavItem[]
  currentView: string
  onNavigate: (view: string) => void
}) {
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const isActive = currentView === item.view
        const Icon = item.icon
        return (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`
              flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 min-h-[44px]
              ${isActive
                ? 'bg-[#2F2FE4] text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }
            `}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
            {isActive && (
              <ChevronRight className="h-4 w-4 ml-auto opacity-60" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Theme toggle                                                       */
/* ------------------------------------------------------------------ */

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 shrink-0"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main AppLayout                                                     */
/* ------------------------------------------------------------------ */

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    sidebarOpen,
    setSidebarOpen,
    adminView,
    setAdminView,
    teacherView,
    setTeacherView,
    studentView,
    setStudentView,
    setUser,
  } = useAppStore()

  const role = user?.role ?? 'ADMIN'

  const navItems = useMemo(() => getNavItems(role), [role])
  const bottomItems = useMemo(() => getBottomItems(role), [role])
  const currentView = getCurrentView(role, { adminView, teacherView, studentView })

  const handleNavigate = (view: string) => {
    if (view === 'more') {
      setSidebarOpen(true)
      return
    }
    switch (role) {
      case 'ADMIN': setAdminView(view as AdminView); break
      case 'TEACHER': setTeacherView(view as TeacherView); break
      case 'STUDENT': setStudentView(view as StudentView); break
    }
  }

  const handleLogout = () => {
    setUser(null)
    toast.success('Logged out successfully')
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ---------- TOP BAR ---------- */}
      <header className="sticky top-0 z-40 flex items-center h-14 px-3 md:px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-9 w-9 shrink-0"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-2 flex-1 justify-center md:justify-start md:pl-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2F2FE4]">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm md:text-base truncate">
            Sankalp Vidya Academy
          </span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 rounded-full p-0" aria-label="User menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#2F2FE4] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground leading-none">
                    {user?.username} · {role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleNavigate('profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ---------- DESKTOP SIDEBAR ---------- */}
        <aside className="hidden md:flex md:w-60 md:flex-col md:border-r bg-sidebar shrink-0">
          <ScrollArea className="flex-1 py-4">
            <SidebarNavItems
              items={navItems}
              currentView={currentView}
              onNavigate={handleNavigate}
            />
          </ScrollArea>
          <div className="p-3 border-t">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2 bg-accent/50">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[#2F2FE4] text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------- MOBILE SIDEBAR (Sheet) ---------- */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="px-4 pt-5 pb-3 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2F2FE4]">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <span className="text-base">Sankalp Vidya Academy</span>
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 py-4">
              <SidebarNavItems
                items={navItems}
                currentView={currentView}
                onNavigate={(view) => {
                  handleNavigate(view)
                  setSidebarOpen(false)
                }}
              />
            </ScrollArea>
            <Separator />
            <div className="p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* ---------- MAIN CONTENT ---------- */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-4 md:p-6 max-w-5xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ---------- BOTTOM NAV (mobile only) ---------- */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {bottomItems.map((item) => {
            const isActive = item.view === 'more'
              ? false
              : currentView === item.view
            const Icon = item.icon
            return (
              <button
                key={item.view}
                onClick={() => handleNavigate(item.view)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-lg transition-colors
                  ${isActive
                    ? 'text-[#2F2FE4]'
                    : 'text-muted-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -bottom-0 h-0.5 w-8 rounded-full bg-[#2F2FE4]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
