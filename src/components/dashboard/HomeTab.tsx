'use client'

import React, { useState, memo } from 'react'
import Link from 'next/link'
import { Profile } from '@/lib/supabase'
import { EmployeeWithStats } from '@/lib/staff-actions'

type EmployeeFilter = 'all' | 'has_active' | 'no_tasks'

// Home Tab Component
const HomeTab = memo(function HomeTab({
    stats,
    profile,
    employees
}: {
    stats: { pending: number; completed: number; total: number }
    profile: Profile | null
    employees: EmployeeWithStats[]
}) {
    const [filter, setFilter] = useState<EmployeeFilter>('all')

    // Filter employees (exclude admins)
    const staffEmployees = employees.filter(emp => emp.role !== 'admin')
    const totalActive = staffEmployees.reduce((sum, e) => sum + e.stats.activeTasks, 0)
    const totalCompleted = staffEmployees.reduce((sum, e) => sum + e.stats.completedTasks, 0)

    const filteredEmployees = staffEmployees.filter(emp => {
        switch (filter) {
            case 'has_active':
                return emp.stats.activeTasks > 0
            case 'no_tasks':
                return emp.stats.totalTasks === 0
            default:
                return true
        }
    })

    return (
        <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl rounded-2xl border border-blue-500/30 dark:border-blue-500/20 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    مرحباً {profile?.full_name || 'بك'} 👋
                </h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                    {new Date().toLocaleDateString('ar-SA', { calendar: 'gregory', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stats Cards */}
            {profile?.role === 'member' && (
                <div className="grid grid-cols-2 gap-4">
                    <StatCard
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        iconBg="bg-amber-500/20"
                        iconColor="text-amber-500"
                        value={stats.pending}
                        label="قيد الانتظار"
                    />
                    <StatCard
                        icon={
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        iconBg="bg-green-500/20"
                        iconColor="text-green-500"
                        value={stats.completed}
                        label="مكتملة"
                    />
                </div>
            )}

            {/* Employees List for Admin */}
            {profile?.role === 'admin' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">الموظفين</h3>
                        <Link
                            href="/dashboard/staff"
                            className="text-sm text-blue-500 hover:text-blue-600"
                        >
                            إدارة الموظفين
                        </Link>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-200 dark:border-slate-700/50 p-3 text-center">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{staffEmployees.length}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">موظف</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-500/10 backdrop-blur-xl rounded-xl border border-amber-200 dark:border-amber-500/20 p-3 text-center">
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalActive}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">نشط</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-500/10 backdrop-blur-xl rounded-xl border border-green-200 dark:border-green-500/20 p-3 text-center">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalCompleted}</p>
                            <p className="text-xs text-green-600 dark:text-green-400">مكتمل</p>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                filter === 'all'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            الكل ({staffEmployees.length})
                        </button>
                        <button
                            onClick={() => setFilter('has_active')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                filter === 'has_active'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            لديهم نشط ({staffEmployees.filter(e => e.stats.activeTasks > 0).length})
                        </button>
                        <button
                            onClick={() => setFilter('no_tasks')}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                                filter === 'no_tasks'
                                    ? 'bg-slate-500 text-white'
                                    : 'bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            بدون مهام ({staffEmployees.filter(e => e.stats.totalTasks === 0).length})
                        </button>
                    </div>

                    {/* Employees List */}
                    {filteredEmployees.length > 0 ? (
                        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                            {/* Desktop Table Header */}
                            <div className="hidden sm:grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <div className="col-span-5">الموظف</div>
                                <div className="col-span-2 text-center">الكل</div>
                                <div className="col-span-2 text-center">نشط</div>
                                <div className="col-span-2 text-center">مكتمل</div>
                                <div className="col-span-1"></div>
                            </div>

                            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {filteredEmployees.map(emp => (
                                    <Link
                                        key={emp.id}
                                        href={`/dashboard/staff/${emp.id}`}
                                        prefetch
                                        className="block p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                                    >
                                        {/* Mobile Card View */}
                                        <div className="sm:hidden">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {emp.full_name?.charAt(0) || emp.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[140px]">{emp.full_name || emp.email}</span>
                                                </div>
                                                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2 mr-10">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    الكل: {emp.stats.totalTasks}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${emp.stats.activeTasks > 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                    نشط: {emp.stats.activeTasks}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                                    مكتمل: {emp.stats.completedTasks}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Desktop Table Row */}
                                        <div className="hidden sm:grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-5 flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {emp.full_name?.charAt(0) || emp.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-slate-900 dark:text-white truncate">{emp.full_name || emp.email}</span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="inline-block min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {emp.stats.totalTasks}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className={`inline-block min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium ${emp.stats.activeTasks > 0 ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                    {emp.stats.activeTasks}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-center">
                                                <span className="inline-block min-w-[24px] px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                                                    {emp.stats.completedTasks}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-left">
                                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 text-center">
                            <p className="text-slate-500 dark:text-slate-400">
                                {filter === 'all' ? 'لا يوجد موظفين' : 'لا يوجد موظفين مطابقين للفلتر'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
})

// Stat Card Component
function StatCard({ icon, iconBg, iconColor, value, label }: {
    icon: React.ReactNode
    iconBg: string
    iconColor: string
    value: number
    label: string
}) {
    return (
        <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 shadow-sm">
            <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <span className={iconColor}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
        </div>
    )
}

export default HomeTab