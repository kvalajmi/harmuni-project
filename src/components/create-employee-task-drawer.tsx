'use client'

import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useAuth } from '@/lib/auth-context'
import { createEmployeeTaskAction } from '@/lib/employee-task-actions'
import { getEmployeesAction } from '@/lib/staff-actions'

interface CreateEmployeeTaskDrawerProps {
    isOpen: boolean
    onClose: () => void
}

export function CreateEmployeeTaskDrawer({ isOpen, onClose }: CreateEmployeeTaskDrawerProps) {
    const { user } = useAuth()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
    const [selectedUsers, setSelectedUsers] = useState<string[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [assignmentType, setAssignmentType] = useState<'individual' | 'group'>('individual')

    useEffect(() => {
        if (isOpen) {
            loadEmployees()
        }
    }, [isOpen])

    const loadEmployees = async () => {
        try {
            const data = await getEmployeesAction()
            // Filter out admin and current user
            const filtered = data.filter(emp =>
                emp.role !== 'admin' && emp.id !== user?.id
            )
            setEmployees(filtered)

            // Extract unique groups
            const uniqueGroups = new Map()
            filtered.forEach(emp => {
                emp.groups?.forEach((group: any) => {
                    if (!uniqueGroups.has(group.id)) {
                        uniqueGroups.set(group.id, {
                            id: group.id,
                            name: group.name,
                            members: []
                        })
                    }
                    uniqueGroups.get(group.id).members.push(emp.id)
                })
            })
            setGroups(Array.from(uniqueGroups.values()))
        } catch (error) {
            console.error('Error loading employees:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || selectedUsers.length === 0 || !user?.id) return

        setLoading(true)
        try {
            const result = await createEmployeeTaskAction(
                title.trim(),
                description.trim() || null,
                selectedUsers,
                priority,
                null,
                user.id
            )

            if (result.success) {
                // Reset form
                setTitle('')
                setDescription('')
                setPriority('normal')
                setSelectedUsers([])
                onClose()
            } else {
                alert(result.error || 'فشل في إنشاء المهمة')
            }
        } catch (error) {
            console.error('Error creating task:', error)
            alert('حدث خطأ غير متوقع')
        } finally {
            setLoading(false)
        }
    }

    const handleUserToggle = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const handleGroupSelect = (groupId: string) => {
        const group = groups.find(g => g.id === groupId)
        if (group) {
            // Toggle all group members
            const allSelected = group.members.every((id: string) => selectedUsers.includes(id))
            if (allSelected) {
                // Remove all group members
                setSelectedUsers(prev => prev.filter(id => !group.members.includes(id)))
            } else {
                // Add all group members
                const newUsers = group.members.filter((id: string) => !selectedUsers.includes(id))
                setSelectedUsers(prev => [...prev, ...newUsers])
            }
        }
    }

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-in-out duration-300"
                                enterFrom="-translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in-out duration-300"
                                leaveFrom="translate-x-0"
                                leaveTo="-translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto relative w-screen max-w-md">
                                    <div className="flex h-full flex-col bg-white dark:bg-slate-900 shadow-xl">
                                        {/* Header */}
                                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                                            <Dialog.Title className="text-xl font-semibold text-slate-900 dark:text-white">
                                                مهمة جديدة بين الموظفين
                                            </Dialog.Title>
                                            <button
                                                onClick={onClose}
                                                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        {/* Form */}
                                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                                            {/* Title */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    عنوان المهمة *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={title}
                                                    onChange={(e) => setTitle(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>

                                            {/* Description */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    الوصف
                                                </label>
                                                <textarea
                                                    value={description}
                                                    onChange={(e) => setDescription(e.target.value)}
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                />
                                            </div>

                                            {/* Priority */}
                                            <div className="mb-6">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    الأولوية
                                                </label>
                                                <select
                                                    value={priority}
                                                    onChange={(e) => setPriority(e.target.value as any)}
                                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="low">منخفضة</option>
                                                    <option value="normal">عادية</option>
                                                    <option value="high">مهمة</option>
                                                    <option value="urgent">عاجلة</option>
                                                </select>
                                            </div>

                                            {/* Assignment Type Toggle */}
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                    إرسال إلى *
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignmentType('individual')}
                                                        className={`px-4 py-2 rounded-lg transition-colors ${
                                                            assignmentType === 'individual'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        موظفين
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAssignmentType('group')}
                                                        className={`px-4 py-2 rounded-lg transition-colors ${
                                                            assignmentType === 'group'
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        مجموعات
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Select Users or Groups */}
                                            <div className="mb-6">
                                                {assignmentType === 'individual' ? (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                                        {employees.length === 0 ? (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                                                                لا يوجد موظفين
                                                            </p>
                                                        ) : (
                                                            employees.map(emp => (
                                                                <label
                                                                    key={emp.id}
                                                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedUsers.includes(emp.id)}
                                                                        onChange={() => handleUserToggle(emp.id)}
                                                                        className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                            {emp.full_name || 'بدون اسم'}
                                                                        </p>
                                                                        {emp.groups?.length > 0 && (
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                                {emp.groups.map((g: any) => g.name).join(', ')}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            ))
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                                        {groups.length === 0 ? (
                                                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                                                                لا توجد مجموعات
                                                            </p>
                                                        ) : (
                                                            groups.map(group => {
                                                                const allSelected = group.members.every((id: string) =>
                                                                    selectedUsers.includes(id)
                                                                )
                                                                return (
                                                                    <label
                                                                        key={group.id}
                                                                        className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={allSelected}
                                                                            onChange={() => handleGroupSelect(group.id)}
                                                                            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                                                {group.name}
                                                                            </p>
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                                                {group.members.length} موظف
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                )
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                                {selectedUsers.length > 0 && (
                                                    <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                                                        تم اختيار {selectedUsers.length} موظف
                                                    </p>
                                                )}
                                            </div>
                                        </form>

                                        {/* Footer */}
                                        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3">
                                            <button
                                                type="submit"
                                                onClick={handleSubmit}
                                                disabled={!title.trim() || selectedUsers.length === 0 || loading}
                                                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {loading ? 'جاري الإرسال...' : 'إرسال المهمة'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}