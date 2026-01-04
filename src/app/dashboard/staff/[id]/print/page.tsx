'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getEmployeeProfileAction, EmployeeProfileData } from '@/lib/staff-actions'

export default function PrintEmployeeReportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const searchParams = useSearchParams()
    const [data, setData] = useState<EmployeeProfileData | null>(null)
    const [loading, setLoading] = useState(true)
    const [printedBy, setPrintedBy] = useState<string>('')
    const [dateFrom, setDateFrom] = useState<string>('')
    const [dateTo, setDateTo] = useState<string>('')
    const router = useRouter()

    // Get date filters from URL
    useEffect(() => {
        const from = searchParams.get('from') || ''
        const to = searchParams.get('to') || ''
        setDateFrom(from)
        setDateTo(to)
    }, [searchParams])

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        // Get current admin info
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') {
            router.push('/dashboard')
            return
        }

        setPrintedBy(adminProfile.full_name || 'مدير النظام')

        // Get employee data
        const employeeData = await getEmployeeProfileAction(id)
        setData(employeeData)
        setLoading(false)

        // Auto print after load (optional - user can trigger manually)
        // setTimeout(() => window.print(), 500)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }

    const formatDateTime = (dateString: string) => {
        const date = new Date(dateString)
        const day = date.getDate()
        const month = date.getMonth() + 1
        const year = date.getFullYear()
        let hours = date.getHours()
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const ampm = hours >= 12 ? 'م' : 'ص'
        hours = hours % 12
        hours = hours ? hours : 12
        return `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`
    }

    const calculateDuration = (start: string, end: string | null) => {
        if (!end) return '-'
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diffMs = endDate.getTime() - startDate.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffDays > 0) return `${diffDays} يوم`
        if (diffHours > 0) return `${diffHours} ساعة`
        return 'أقل من ساعة'
    }

    // Filter data by date range
    const filterByDate = <T extends { assigned_at?: string; created_at?: string }>(items: T[]): T[] => {
        if (!dateFrom && !dateTo) return items

        return items.filter(item => {
            const itemDate = new Date(item.assigned_at || item.created_at || '')
            if (dateFrom && itemDate < new Date(dateFrom)) return false
            if (dateTo && itemDate > new Date(dateTo + 'T23:59:59')) return false
            return true
        })
    }

    const handlePrint = () => {
        window.print()
    }

    const handleDateFilter = () => {
        const params = new URLSearchParams()
        if (dateFrom) params.set('from', dateFrom)
        if (dateTo) params.set('to', dateTo)
        router.push(`/dashboard/staff/${id}/print?${params.toString()}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <p className="text-gray-500">لم يتم العثور على الموظف</p>
            </div>
        )
    }

    // Filter tasks and circulars
    const filteredActiveTasks = filterByDate(data.activeTasks)
    const filteredCompletedTasks = filterByDate(data.completedTasks)
    const allFilteredTasks = [...filteredActiveTasks, ...filteredCompletedTasks].sort(
        (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
    )
    const filteredCirculars = filterByDate(data.circulars)

    // Calculate stats
    const completedCount = filteredCompletedTasks.length
    const pendingCount = filteredActiveTasks.length
    const totalTasks = completedCount + pendingCount
    const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
    const readCirculars = filteredCirculars.filter(c => c.is_read).length
    const unreadCirculars = filteredCirculars.filter(c => !c.is_read).length

    return (
        <>
            {/* Print Controls - Hidden when printing */}
            <div className="print:hidden bg-slate-100 p-4 sticky top-0 z-50 border-b shadow-sm">
                <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            رجوع
                        </button>
                        <h1 className="font-bold text-slate-900">معاينة كشف الموظف</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">من:</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">إلى:</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1 border rounded text-sm"
                            />
                        </div>
                        <button
                            onClick={handleDateFilter}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 rounded text-sm"
                        >
                            تطبيق
                        </button>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        طباعة / PDF
                    </button>
                </div>
            </div>

            {/* Printable Content */}
            <div className="bg-white min-h-screen p-8 print:p-4" dir="rtl">
                <div className="max-w-4xl mx-auto">

                    {/* Header with Logo */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-[#c9a86c]">
                        <div className="mb-4">
                            <h1 className="text-3xl font-bold text-[#4a5568] tracking-wide">HARMUNI PLUS</h1>
                            <p className="text-[#c9a86c] text-sm tracking-widest">L.L.C COMPANY</p>
                        </div>
                        <div className="w-32 h-0.5 bg-[#c9a86c] mx-auto mb-4"></div>
                        <h2 className="text-xl font-bold text-slate-700">كشف أداء الموظف</h2>
                    </div>

                    {/* Employee Info */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-6 print:bg-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">اسم الموظف</p>
                                <p className="font-bold text-slate-900">{data.profile.full_name || 'بدون اسم'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">القسم / المجموعة</p>
                                <p className="font-bold text-slate-900">
                                    {data.profile.groups.map(g => g.name).join('، ') || 'غير محدد'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">تاريخ الكشف</p>
                                <p className="font-bold text-slate-900">{formatDate(new Date().toISOString())}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">طُبع بواسطة</p>
                                <p className="font-bold text-slate-900">{printedBy}</p>
                            </div>
                            {(dateFrom || dateTo) && (
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-500">فترة التقرير</p>
                                    <p className="font-bold text-slate-900">
                                        {dateFrom ? formatDate(dateFrom) : 'البداية'} - {dateTo ? formatDate(dateTo) : 'الآن'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-3 text-center print:border print:border-blue-200">
                            <p className="text-2xl font-bold text-blue-600">{totalTasks}</p>
                            <p className="text-xs text-slate-600">إجمالي المهام</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3 text-center print:border print:border-green-200">
                            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                            <p className="text-xs text-slate-600">مكتمل</p>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center print:border print:border-amber-200">
                            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                            <p className="text-xs text-slate-600">قيد التنفيذ</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center print:border print:border-purple-200">
                            <p className="text-2xl font-bold text-purple-600">{completionRate}%</p>
                            <p className="text-xs text-slate-600">نسبة الإنجاز</p>
                        </div>
                    </div>

                    {/* Tasks Table */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-blue-500 rounded"></span>
                            المهام ({allFilteredTasks.length})
                        </h3>
                        {allFilteredTasks.length > 0 ? (
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-slate-300 p-2 text-right">#</th>
                                        <th className="border border-slate-300 p-2 text-right">المهمة</th>
                                        <th className="border border-slate-300 p-2 text-right">تاريخ الإرسال</th>
                                        <th className="border border-slate-300 p-2 text-right">الحالة</th>
                                        <th className="border border-slate-300 p-2 text-right">تاريخ الإنجاز</th>
                                        <th className="border border-slate-300 p-2 text-right">المدة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allFilteredTasks.map((task, index) => (
                                        <tr key={task.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                                            <td className="border border-slate-300 p-2">{task.task_title}</td>
                                            <td className="border border-slate-300 p-2 text-sm">{formatDateTime(task.assigned_at)}</td>
                                            <td className="border border-slate-300 p-2">
                                                <span className={`px-2 py-0.5 rounded text-xs ${
                                                    task.status === 'completed'
                                                        ? 'bg-green-100 text-green-700'
                                                        : task.status === 'in_progress'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {task.status === 'completed' ? 'مكتمل' : task.status === 'in_progress' ? 'قيد التنفيذ' : 'معلق'}
                                                </span>
                                            </td>
                                            <td className="border border-slate-300 p-2 text-sm">
                                                {task.completed_at ? formatDateTime(task.completed_at) : '-'}
                                            </td>
                                            <td className="border border-slate-300 p-2 text-sm">
                                                {calculateDuration(task.assigned_at, task.completed_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-center py-4 bg-slate-50 rounded">لا توجد مهام في هذه الفترة</p>
                        )}
                    </div>

                    {/* Circulars Table */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="w-1 h-6 bg-purple-500 rounded"></span>
                            التعاميم ({filteredCirculars.length}) - {readCirculars} مقروء | {unreadCirculars} غير مقروء
                        </h3>
                        {filteredCirculars.length > 0 ? (
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-100">
                                        <th className="border border-slate-300 p-2 text-right">#</th>
                                        <th className="border border-slate-300 p-2 text-right">التعميم</th>
                                        <th className="border border-slate-300 p-2 text-right">المُرسل</th>
                                        <th className="border border-slate-300 p-2 text-right">تاريخ الإرسال</th>
                                        <th className="border border-slate-300 p-2 text-right">تاريخ القراءة</th>
                                        <th className="border border-slate-300 p-2 text-right">المدة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCirculars.map((circular, index) => (
                                        <tr key={circular.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="border border-slate-300 p-2 text-center">{index + 1}</td>
                                            <td className="border border-slate-300 p-2">{circular.title}</td>
                                            <td className="border border-slate-300 p-2">{circular.sender_name}</td>
                                            <td className="border border-slate-300 p-2 text-sm">{formatDateTime(circular.created_at)}</td>
                                            <td className="border border-slate-300 p-2 text-sm">
                                                {circular.read_at ? (
                                                    formatDateTime(circular.read_at)
                                                ) : (
                                                    <span className="text-red-500">لم يُقرأ</span>
                                                )}
                                            </td>
                                            <td className="border border-slate-300 p-2 text-sm">
                                                {calculateDuration(circular.created_at, circular.read_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="text-slate-500 text-center py-4 bg-slate-50 rounded">لا توجد تعاميم في هذه الفترة</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-6 border-t-2 border-[#c9a86c] text-center text-sm text-slate-500">
                        <p>هذا الكشف صادر من نظام Ops Room - هارموني بلس للتجارة العامة</p>
                        <p className="mt-1">تاريخ الطباعة: {formatDateTime(new Date().toISOString())}</p>
                    </div>

                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    )
}
