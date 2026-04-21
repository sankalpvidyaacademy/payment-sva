'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  User,
  Lock,
  Download,
  Upload,
  AlertTriangle,
  Sun,
  Moon,
  Monitor,
  Shield,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

export default function Profile() {
  const { user } = useAppStore()
  const { theme, setTheme } = useTheme()

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Backup
  const [downloadingBackup, setDownloadingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters')
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user!.id,
          oldPassword,
          newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Password changed successfully')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setChangingPassword(false)
  }

  const handleDownloadBackup = async () => {
    setDownloadingBackup(true)
    try {
      const res = await fetch('/api/backup')
      if (res.ok) {
        const data = await res.json()
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sankalp-vidya-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Backup downloaded successfully')
      } else {
        toast.error('Failed to download backup')
      }
    } catch {
      toast.error('Something went wrong')
    }
    setDownloadingBackup(false)
  }

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      toast.error('Please select a backup file')
      return
    }

    setRestoringBackup(true)
    try {
      const fileContent = await selectedFile.text()
      const backupData = JSON.parse(fileContent)

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: backupData.data }),
      })

      const result = await res.json()
      if (res.ok) {
        toast.success(`Backup restored successfully! ${result.counts ? Object.entries(result.counts).map(([k, v]) => `${k}: ${v}`).join(', ') : ''}`)
        setSelectedFile(null)
        setRestoreDialogOpen(false)
      } else {
        toast.error(result.error || 'Failed to restore backup')
      }
    } catch (e) {
      toast.error('Invalid backup file or failed to parse')
    }
    setRestoringBackup(false)
  }

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6 text-brand" />
        <h2 className="text-2xl font-bold">Profile & Settings</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <Badge variant="secondary">{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Lock className="h-4 w-4" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-old-pw">Old Password</Label>
              <Input
                id="profile-old-pw"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-new-pw">New Password</Label>
              <Input
                id="profile-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-confirm-pw">Confirm New Password</Label>
              <Input
                id="profile-confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Theme Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>Choose your preferred appearance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon
              const isActive = theme === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-accent ${
                    isActive
                      ? 'border-brand bg-brand/5'
                      : 'border-transparent'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      isActive ? 'text-brand' : 'text-muted-foreground'
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isActive ? 'text-brand' : 'text-muted-foreground'
                    }`}
                  >
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Backup Section - Admin Only */}
      {user?.role === 'ADMIN' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Download className="h-4 w-4" />
              Backup & Restore
            </CardTitle>
            <CardDescription>
              Download a full backup or restore from a previous backup file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Download Backup */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium">Download Backup</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export all data as a JSON file including students, teachers, fees, salary, and expenses.
                </p>
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={handleDownloadBackup}
                  disabled={downloadingBackup}
                >
                  {downloadingBackup ? 'Downloading...' : 'Download Backup'}
                </Button>
              </div>

              {/* Restore Backup */}
              <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-destructive" />
                  <h4 className="font-medium">Restore Backup</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Restore data from a previously exported backup file. This will overwrite all existing data.
                </p>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedFile(file)
                      }
                    }}
                    className="text-sm"
                  />
                  <Button
                    variant="destructive"
                    className="w-full gap-1.5"
                    onClick={() => {
                      if (selectedFile) {
                        setRestoreDialogOpen(true)
                      } else {
                        toast.error('Please select a backup file first')
                      }
                    }}
                    disabled={!selectedFile || restoringBackup}
                  >
                    {restoringBackup ? 'Restoring...' : 'Restore Backup'}
                  </Button>
                </div>
              </div>
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Restoring a backup will permanently overwrite all existing data. This action cannot be undone. 
                Make sure to download a backup of the current data before restoring.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Restore Backup
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently overwrite all existing data with the backup file
              {selectedFile ? ` "${selectedFile.name}"` : ''}. This action cannot be undone.
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoringBackup}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreBackup}
              disabled={restoringBackup}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {restoringBackup ? 'Restoring...' : 'Yes, Restore Backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
