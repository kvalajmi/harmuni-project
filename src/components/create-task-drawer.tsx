'use client'

import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTaskAction, getUsersAction, getGroupsAction, AssignmentType, Priority } from '@/lib/actions'
import { useToast } from '@/components/toast'

interface CreateTaskDrawerProps {
    open: boolean
    onClose: () => void
    onCreated: () => void
    userId: string
}

export function CreateTaskDrawer({ open, onClose, onCreated, userId }: CreateTaskDrawerProps) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState<Priority>('medium')
    const [assignmentType, setAssignmentType] = useState<AssignmentType>('individual')
    const [assigneeId, setAssigneeId] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { showToast } = useToast()

    // Data for selects
    const [users, setUsers] = useState<{ id: string; full_name: string | null }[]>([])
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
    const [loadingData, setLoadingData] = useState(true)

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open])

    const loadData = async () => {
        setLoadingData(true)
        try {
            const [usersData, groupsData] = await Promise.all([
                getUsersAction(),
                getGroupsAction()
            ])
            setUsers(usersData)
            setGroups(groupsData)
        } catch (e) {
            console.error('Error loading data:', e)
        } finally {
            setLoadingData(false)
        }
    }

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError('يرجى إدخال عنوان المهمة')
            return
        }

        if (assignmentType !== 'all' && !assigneeId) {
            setError('يرجى تحديد المستلم')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const result = await createTaskAction({
                title,
                description,
                priority,
                assignmentType,
                assigneeId: assignmentType === 'all' ? undefined : assigneeId,
                createdBy: userId
            })

            if (result.success) {
                // Reset form
                setTitle('')
                setDescription('')
                setPriority('medium')
                setAssignmentType('individual')
                setAssigneeId('')
                showToast('تم إنشاء المهمة وتوزيعها بنجاح ✓', 'success')
                onCreated()
                onClose()
            } else {
                setError(result.error || 'حدث خطأ')
                showToast(result.error || 'حدث خطأ في إنشاء المهمة', 'error')
            }
        } catch (e) {
            console.error('Error creating task:', e)
            setError('حدث خطأ غير متوقع')
            showToast('حدث خطأ غير متوقع', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            onClose()
        }
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 max-h-[90vh]">
                <div className="mx-auto w-full max-w-lg overflow-y-auto">
                    <DrawerHeader className="text-right">
                        <DrawerTitle className="text-xl font-bold text-slate-900 dark:text-white">مهمة جديدة</DrawerTitle>
                        <DrawerDescription className="text-slate-500 dark:text-slate-400">
                            أنشئ مهمة جديدة ووزّعها على الفريق
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="p-4 space-y-5">
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-slate-700 dark:text-slate-300">عنوان المهمة *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="أدخل عنوان المهمة"
                                className="h-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl"
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-700 dark:text-slate-300">الوصف</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="وصف تفصيلي للمهمة (اختياري)"
                                rows={3}
                                className="bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl resize-none"
                                disabled={loading}
                            />
                        </div>

                        {/* Priority */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">الأولوية</Label>
                            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)} disabled={loading}>
                                <SelectTrigger className="h-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-xl">
                                    <SelectValue placeholder="اختر الأولوية" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                    <SelectItem value="low" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                            منخفضة
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="medium" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            متوسطة
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="high" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                            عالية
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Assignment Type */}
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">توزيع المهمة على</Label>
                            <Select value={assignmentType} onValueChange={(v) => { setAssignmentType(v as AssignmentType); setAssigneeId('') }} disabled={loading}>
                                <SelectTrigger className="h-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-xl">
                                    <SelectValue placeholder="اختر نوع التوزيع" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                    <SelectItem value="individual" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            موظف محدد
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="group" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            مجموعة
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="all" className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                        <div className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            جميع الموظفين
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Assignee Selection - Individual */}
                        {assignmentType === 'individual' && (
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">اختر الموظف</Label>
                                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading || loadingData}>
                                    <SelectTrigger className="h-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-xl">
                                        <SelectValue placeholder={loadingData ? "جاري التحميل..." : "اختر موظف"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-h-60">
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id} className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                                {user.full_name || 'بدون اسم'}
                                            </SelectItem>
                                        ))}
                                        {users.length === 0 && !loadingData && (
                                            <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-sm">
                                                لا يوجد موظفين
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Assignee Selection - Group */}
                        {assignmentType === 'group' && (
                            <div className="space-y-2">
                                <Label className="text-slate-700 dark:text-slate-300">اختر المجموعة</Label>
                                <Select value={assigneeId} onValueChange={setAssigneeId} disabled={loading || loadingData}>
                                    <SelectTrigger className="h-12 bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600/50 text-slate-900 dark:text-white rounded-xl">
                                        <SelectValue placeholder={loadingData ? "جاري التحميل..." : "اختر مجموعة"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-h-60">
                                        {groups.map((group) => (
                                            <SelectItem key={group.id} value={group.id} className="focus:bg-slate-100 dark:focus:bg-slate-700 focus:text-slate-900 dark:focus:text-white">
                                                {group.name}
                                            </SelectItem>
                                        ))}
                                        {groups.length === 0 && !loadingData && (
                                            <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-sm">
                                                لا توجد مجموعات. أنشئ مجموعة أولاً.
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* All Staff Info */}
                        {assignmentType === 'all' && (
                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-green-700 dark:text-green-400 font-medium">توزيع شامل</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm">سيتم إرسال المهمة لجميع الموظفين ({users.length} موظف)</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DrawerFooter className="pt-4 pb-8">
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>جاري الإرسال...</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    <span>توزيع المهمة</span>
                                </div>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={loading}
                            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        >
                            إلغاء
                        </Button>
                    </DrawerFooter>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
