'use client'

import useSWR from 'swr'
import {
    getEmployeesWithStatsAction,
    getAssignedTasksAction,
    getNotificationsAction,
    getCreatedTasksAction,
    getEmployeeProfileAction,
    getTaskDetailsAction,
    getTaskCommentsAction,
    EmployeeWithStats,
    AssignedTask,
    EmployeeProfileData,
    TaskDetails,
    TaskComment
} from './staff-actions'
import { getAdminCircularsAction, getStaffCircularsAction, Circular } from './circular-actions'

// SWR Configuration
const swrConfig = {
    revalidateOnFocus: false,      // Don't refetch on window focus
    revalidateOnReconnect: true,   // Refetch on reconnect
    dedupingInterval: 30000,       // Dedupe requests within 30 seconds
    errorRetryCount: 3,
}

// Staff circular type
interface StaffCircular extends Circular {
    is_read: boolean
    read_at: string | null
}

// ============== DASHBOARD HOOKS ==============

// Hook for employees with stats (Admin)
export function useEmployeesWithStats() {
    return useSWR<EmployeeWithStats[]>(
        'employees-with-stats',
        () => getEmployeesWithStatsAction(),
        { ...swrConfig, revalidateIfStale: true }
    )
}

// Hook for assigned tasks (Staff)
export function useAssignedTasks(userId: string | null) {
    return useSWR<AssignedTask[]>(
        userId ? ['assigned-tasks', userId] : null,
        () => getAssignedTasksAction(userId!),
        swrConfig
    )
}

// Hook for created tasks (Admin)
export function useCreatedTasks(userId: string | null) {
    return useSWR(
        userId ? ['created-tasks', userId] : null,
        () => getCreatedTasksAction(userId!),
        swrConfig
    )
}

// Hook for notifications
export function useNotifications(userId: string | null) {
    return useSWR(
        userId ? ['notifications', userId] : null,
        () => getNotificationsAction(userId!),
        { ...swrConfig, refreshInterval: 60000 } // Refresh every 60 seconds
    )
}

// Hook for admin circulars
export function useAdminCirculars(userId: string | null) {
    return useSWR<Circular[]>(
        userId ? ['admin-circulars', userId] : null,
        () => getAdminCircularsAction(userId!),
        swrConfig
    )
}

// Hook for staff circulars
export function useStaffCirculars(userId: string | null) {
    return useSWR<StaffCircular[]>(
        userId ? ['staff-circulars', userId] : null,
        () => getStaffCircularsAction(userId!),
        swrConfig
    )
}

// ============== EMPLOYEE PROFILE HOOKS ==============

export function useEmployeeProfile(employeeId: string | null) {
    return useSWR<EmployeeProfileData | null>(
        employeeId ? ['employee-profile', employeeId] : null,
        () => getEmployeeProfileAction(employeeId!),
        swrConfig
    )
}

// ============== TASK DETAILS HOOKS ==============

export function useTaskDetails(taskId: string | null) {
    return useSWR<TaskDetails | null>(
        taskId ? ['task-details', taskId] : null,
        () => getTaskDetailsAction(taskId!),
        swrConfig
    )
}

export function useTaskComments(taskId: string | null) {
    return useSWR<TaskComment[]>(
        taskId ? ['task-comments', taskId] : null,
        () => getTaskCommentsAction(taskId!),
        { ...swrConfig, refreshInterval: 5000 } // Refresh comments every 5 seconds for live chat
    )
}

// ============== MUTATION HELPERS ==============

// These help invalidate cache after mutations
export const mutationKeys = {
    employees: 'employees-with-stats',
    assignedTasks: (userId: string) => ['assigned-tasks', userId],
    createdTasks: (userId: string) => ['created-tasks', userId],
    notifications: (userId: string) => ['notifications', userId],
    adminCirculars: (userId: string) => ['admin-circulars', userId],
    staffCirculars: (userId: string) => ['staff-circulars', userId],
    employeeProfile: (employeeId: string) => ['employee-profile', employeeId],
    taskDetails: (taskId: string) => ['task-details', taskId],
    taskComments: (taskId: string) => ['task-comments', taskId],
}
