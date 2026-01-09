
import { getEmployeeProfileAction, getEmployeeTasksAction } from '@/lib/staff-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ErrorBoundary } from '@/components/error-boundary'
// import { EmployeeProfileContent } from '@/components/dashboard/employee-profile-content'

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

    // Get initial tasks for server-side rendering
    const tasksData = await getEmployeeTasksAction(id)

    // Merge into initialData format
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
                        v3.1-ISOLATION
                    </span>
                </div>

                <ErrorBoundary>
                    {/* 
                    <EmployeeProfileContent 
                        initialData={initialData} 
                        employeeId={id} 
                    /> 
                    */}
                    <div className="p-8 border-4 border-blue-500 rounded-xl bg-blue-50 text-blue-900">
                        <h1 className="text-3xl font-bold">🧪 SUPER ISOLATION TEST 🧪</h1>
                        <p className="mt-4">If you see this, the Page/Server Actions are FINE.</p>
                        <p>The crash is inside EmployeeProfileContent or its dependencies.</p>
                        <div className="mt-4 p-4 bg-white rounded overflow-auto max-h-96 text-xs whitespace-pre-wrap font-mono">
                            {JSON.stringify(initialData, null, 2)}
                        </div>
                    </div>
                </ErrorBoundary>
            </div>
        </div>
    )
}
