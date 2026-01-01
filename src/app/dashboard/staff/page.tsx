'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createEmployeeAction, getEmployeesAction, deleteEmployeeAction, Employee } from '@/lib/staff-actions'
import { getGroupsAction } from '@/lib/actions'

export default function StaffPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddDialog, setShowAddDialog] = useState(false)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()

    useEffect(() => {
        checkAdminAndLoad()
    }, [])

    const checkAdminAndLoad = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            router.push('/dashboard')
            return
        }

        setIsAdmin(true)
        await loadData()
    }

    const loadData = async () => {
        setLoading(true)
        const [employeesData, groupsData] = await Promise.all([
            getEmployeesAction(),
            getGroupsAction()
        ])
        setEmployees(employeesData)
        setGroups(groupsData)
        setLoading(false)
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/dashboard')} className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">إدارة الموظفين</h1>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} size="sm" className="bg-blue-500 hover:bg-blue-600">
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        إضافة موظف
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-200 dark:border-slate-700/50 hover:bg-transparent">
                                    <TableHead className="text-slate-500 dark:text-slate-400 text-right">الموظف</TableHead>
                                    <TableHead className="text-slate-500 dark:text-slate-400 text-right">الدور</TableHead>
                                    <TableHead className="text-slate-500 dark:text-slate-400 text-right">المجموعات</TableHead>
                                    <TableHead className="text-slate-500 dark:text-slate-400 text-right w-20">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((emp) => (
                                    <TableRow key={emp.id} className="border-slate-200 dark:border-slate-700/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600">
                                                    <AvatarFallback className="bg-transparent text-white font-semibold">
                                                        {emp.full_name?.charAt(0) || emp.email.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white">{emp.full_name || 'بدون اسم'}</p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">{emp.email}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={emp.role === 'admin' ? 'default' : 'secondary'}
                                                className={emp.role === 'admin' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30' : 'bg-slate-100 dark:bg-slate-600/50 text-slate-700 dark:text-slate-300'}>
                                                {emp.role === 'admin' ? 'مدير' : 'موظف'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {emp.groups.length > 0 ? (
                                                    emp.groups.map(g => (
                                                        <Badge key={g.id} variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300">
                                                            {g.name}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-slate-500 text-sm">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(emp.id, emp.email)}
                                                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {employees.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-slate-500 dark:text-slate-400">
                                            لا يوجد موظفين مسجلين
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </main>

            {/* Add Employee Dialog */}
            <AddEmployeeDialog
                open={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                onSuccess={loadData}
                groups={groups}
            />
        </div>
    )

    async function handleDelete(id: string, email: string) {
        if (!confirm(`هل أنت متأكد من حذف ${email}؟`)) return
        const result = await deleteEmployeeAction(id)
        if (result.success) loadData()
    }
}

function AddEmployeeDialog({ open, onClose, onSuccess, groups }: {
    open: boolean
    onClose: () => void
    onSuccess: () => void
    groups: { id: string; name: string }[]
}) {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [role, setRole] = useState<'admin' | 'member'>('member')
    const [groupId, setGroupId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset group when role changes to admin
    const handleRoleChange = (newRole: 'admin' | 'member') => {
        setRole(newRole)
        if (newRole === 'admin') {
            setGroupId('')
        }
    }

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
        let pwd = ''
        for (let i = 0; i < 10; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
        setPassword(pwd)
    }

    const handleSubmit = async () => {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
            setError('يرجى ملء جميع الحقول المطلوبة')
            return
        }

        // Employees MUST select a group
        if (role === 'member' && !groupId) {
            setError('يجب اختيار مجموعة للموظف')
            return
        }

        setLoading(true)
        setError(null)

        const result = await createEmployeeAction({
            fullName,
            email,
            password,
            role,
            groupId: groupId || undefined
        })

        if (result.success) {
            // Reset form
            setFullName('')
            setEmail('')
            setPassword('')
            setRole('member')
            setGroupId('')
            onSuccess()
            onClose()
        } else {
            setError(result.error || 'حدث خطأ')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-slate-900 dark:text-white">إضافة موظف جديد</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        أضف موظفاً جديداً للنظام وحدد صلاحياته
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">الاسم الكامل *</Label>
                        <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="أدخل اسم الموظف"
                            className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">البريد الإلكتروني *</Label>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="employee@company.com"
                            className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">كلمة المرور *</Label>
                        <div className="flex gap-2">
                            <Input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="كلمة المرور"
                                className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 flex-1 text-slate-900 dark:text-white"
                            />
                            <Button type="button" variant="outline" onClick={generatePassword} className="border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                                توليد
                            </Button>
                        </div>
                    </div>

                    {/* Role Selection - Radio Buttons Style */}
                    <div className="space-y-3">
                        <Label className="text-slate-700 dark:text-slate-300">نوع الحساب *</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleRoleChange('member')}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${role === 'member'
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-500'
                                    }`}
                            >
                                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <p className={`font-medium ${role === 'member' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>موظف</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">صلاحيات محدودة</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleRoleChange('admin')}
                                className={`p-4 rounded-xl border-2 transition-all text-center ${role === 'admin'
                                    ? 'border-purple-500 bg-purple-500/10'
                                    : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-500'
                                    }`}
                            >
                                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <p className={`font-medium ${role === 'admin' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-900 dark:text-white'}`}>مدير / شريك</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">صلاحيات كاملة</p>
                            </button>
                        </div>
                    </div>

                    {/* Group Selection - Only for Employees */}
                    {role === 'member' && (
                        <div className="space-y-3">
                            <Label className="text-slate-700 dark:text-slate-300">المجموعة *</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {groups.map(g => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setGroupId(g.id)}
                                        className={`p-3 rounded-xl border-2 transition-all text-right flex items-center gap-3 ${groupId === g.id
                                            ? 'border-green-500 bg-green-500/10'
                                            : 'border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/30 hover:border-slate-300 dark:hover:border-slate-500'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${g.name.includes('محاكم') ? 'bg-amber-500/20' : 'bg-blue-500/20'
                                            }`}>
                                            {g.name.includes('محاكم') ? (
                                                <svg className="w-4 h-4 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className={`font-medium flex-1 ${groupId === g.id ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                            {g.name}
                                        </span>
                                        {groupId === g.id && (
                                            <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Info */}
                    {role === 'admin' && (
                        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-purple-600 dark:text-purple-400 font-medium">حساب مدير</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">سيكون له صلاحيات كاملة مثلك</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="text-slate-500 dark:text-slate-400">إلغاء</Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-500 hover:bg-blue-600">
                        {loading ? 'جاري الإضافة...' : 'إضافة الموظف'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
