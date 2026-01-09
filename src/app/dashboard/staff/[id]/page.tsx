
import { getEmployeeProfileAction, getEmployeeTasksAction, type EmployeeProfileData } from '@/lib/staff-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EmployeeProfileContent } from '@/components/dashboard/employee-profile-content'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export default async function StaffProfilePage({ params }: Props) {
    const { id } = await params

    // Fetch initial data - RESTORED
    const profileData = await getEmployeeProfileAction(id)

    if (!profileData) {
        notFound()
    }

    // Tasks fetching - STILL DISABLED for diagnostics
    // const tasksData = await getEmployeeTasksAction(id)

    // Construct initial data with real profile but clear tasks
    const initialData: EmployeeProfileData = {
        profile: profileData.profile,
        // Stubbed task data to prevent serialization issues from tasks
        activeTasks: [],
        completedTasks: [],
        circulars: [],
        stats: {
            activeCount: 0,
            completedCount: 0,
            circularCount: 0,
            unreadCircularCount: 0
        }
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
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 border border-yellow-200">
                        v3.3-PROFILE-ONLY
                    </span>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800">
                    <strong>DIAGNOSTIC PHASE 2:</strong> Profile Data Loaded. Tasks Data Stubbed.
                </div>

                <EmployeeProfileContent
                    initialData={initialData}
                    employeeId={id}
                />
            </div>
        </div>
    )
}
