
import { getEmployeeProfileAction, getEmployeeTasksAction } from '@/lib/staff-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function StaffProfilePage({ params }: Props) {
    const { id } = await params

    // Fetch initial data
    const profileData = await getEmployeeProfileAction(id)

    if (!profileData) {
        notFound()
    }

    // Get initial tasks
    const tasksData = await getEmployeeTasksAction(id)

    const initialData = {
        ...profileData,
        ...tasksData
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Link href="/dashboard/staff" className="hover:text-blue-600 transition-colors">
                        الموظفين
                    </Link>
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{initialData.profile.full_name}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 border border-purple-200">
                        v3.1-NO-BOUNDARY
                    </span>
                </div>

                <div className="p-8 border-4 border-green-500 rounded-xl bg-green-50 text-green-900">
                    <h1 className="text-3xl font-bold">✅ NO ERROR BOUNDARY TEST ✅</h1>
                    <p className="mt-4">If you see this, ErrorBoundary was the culprit!</p>
                    <div className="mt-4 p-4 bg-white rounded overflow-auto max-h-96 text-xs whitespace-pre-wrap font-mono">
                        {JSON.stringify(initialData, null, 2)}
                    </div>
                </div>
            </div>
        </div>
    )
}
