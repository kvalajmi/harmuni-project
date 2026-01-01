'use client'

import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createCircularAction } from '@/lib/circular-actions'
import { getGroupsAction } from '@/lib/actions'
import { useToast } from '@/components/toast'

interface CreateCircularDrawerProps {
    open: boolean
    onClose: () => void
    onCreated: () => void
    userId: string
}

export function CreateCircularDrawer({ open, onClose, onCreated, userId }: CreateCircularDrawerProps) {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [assignmentType, setAssignmentType] = useState<'all' | 'group'>('all')
    const [groupId, setGroupId] = useState<string>('')
    const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const { showToast } = useToast()

    useEffect(() => {
        if (open) {
            loadGroups()
        }
    }, [open])

    const loadGroups = async () => {
        const groupsData = await getGroupsAction()
        setGroups(groupsData)
    }

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            setError('يرجى ملء جميع الحقول المطلوبة')
            return
        }

        if (assignmentType === 'group' && !groupId) {
            setError('يرجى اختيار المجموعة')
            return
        }

        setLoading(true)
        setError(null)

        const result = await createCircularAction({
            title: title.trim(),
            content: content.trim(),
            assignmentType,
            groupId: assignmentType === 'group' ? groupId : undefined,
            createdBy: userId
        })

        setLoading(false)

        if (result.success) {
            // Reset form
            setTitle('')
            setContent('')
            setAssignmentType('all')
            setGroupId('')
            showToast('تم إرسال التعميم بنجاح ✓', 'success')
            onCreated()
            onClose()
        } else {
            setError(result.error || 'فشل في إنشاء التعميم')
            showToast(result.error || 'فشل في إرسال التعميم', 'error')
        }
    }

    return (
        <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DrawerContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-h-[90vh]">
                <DrawerHeader className="border-b border-slate-200 dark:border-slate-700/50 pb-4">
                    <DrawerTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                        </div>
                        تعميم جديد
                    </DrawerTitle>
                </DrawerHeader>

                <div className="p-4 space-y-5 overflow-y-auto">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">عنوان التعميم *</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="أدخل عنوان التعميم"
                            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">محتوى التعميم *</Label>
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="اكتب محتوى التعميم هنا..."
                            rows={6}
                            className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                        />
                    </div>

                    {/* Assignment Type */}
                    <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-300">إرسال إلى</Label>
                        <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as 'all' | 'group')}>
                            <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                <SelectValue placeholder="اختر المستلمين" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectItem value="all" className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700">جميع الموظفين</SelectItem>
                                <SelectItem value="group" className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700">مجموعة محددة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Group Selection */}
                    {assignmentType === 'group' && (
                        <div className="space-y-2">
                            <Label className="text-slate-700 dark:text-slate-300">اختر المجموعة</Label>
                            <Select value={groupId} onValueChange={setGroupId}>
                                <SelectTrigger className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                    <SelectValue placeholder="اختر المجموعة" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                    {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id} className="text-slate-900 dark:text-white focus:bg-slate-100 dark:focus:bg-slate-700">
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Info Note */}
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>التعاميم هي رسائل للقراءة فقط. سيتمكن الموظفون من تأكيد استلامها وقراءتها.</span>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || !title.trim() || !content.trim()}
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                إرسال التعميم
                            </>
                        )}
                    </Button>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
