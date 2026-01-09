
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
    // const profileData = await getEmployeeProfileAction(id)

    // if (!profileData) {
    //     notFound()
    // }

    // Get initial tasks
    // const tasksData = await getEmployeeTasksAction(id)

    // const initialData = {
    //     ...profileData,
    //     ...tasksData
    // }

    const initialData = { profile: { full_name: 'Debug User' } } as any

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
                    <span>Debug User</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 border border-red-200">
                        v3.2-SAFE-MODE
                    </span>
                </div>

                <div className="p-8 border-2 border-dashed border-red-300 rounded-xl bg-red-50 text-center">
                    <h2 className="text-xl font-bold text-red-800 mb-2">SAFE MODE DIAGNOSTIC</h2>
                    <p className="text-red-600">
                        Data fetching disabled. Loading.tsx disabled.
                        If this page loads, the issue was in data fetching or loading.tsx.
                    </p>
                </div>
            </div>
        </div>
    )
}
