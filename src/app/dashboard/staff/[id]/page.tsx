import { getEmployeeProfileAction, getEmployeeTasksAction, type EmployeeProfileData } from '@/lib/staff-actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { EmployeeProfileContent } from '@/components/dashboard/employee-profile-content'

// Revalidate every 60 seconds for better caching
export const revalidate = 60

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

    // Get initial tasks (Restored)
    const tasksData = await getEmployeeTasksAction(id)

    const initialData: EmployeeProfileData = {
        ...profileData,
        ...tasksData
    }

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Link href="/dashboard?tab=home" className="hover:text-blue-600 transition-colors">
                        الرئيسية
                    </Link>
                    <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 241 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span>{initialData.profile.full_name}</span>

                </div>

                <EmployeeProfileContent
                    initialData={initialData}
                    employeeId={id}
                />
            </div>
        </div>
    )
}
