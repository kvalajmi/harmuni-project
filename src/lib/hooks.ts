'use client'

import useSWR from 'swr'
import {
    getEmployeesWithStatsAction,
    getAssignedTasksAction,
    getNotificationsAction,
    getCreatedTasksAction,
    getAdminTasksWithAssignmentsAction,
    getEmployeeProfileAction,
    getEmployeeProfileBasicAction,
    getEmployeeTasksAction,
    getEmployeeCircularsAction,
    getTaskDetailsAction,
    getTaskCommentsAction,
    EmployeeWithStats,
    AssignedTask,
    AdminTaskWithAssignments,
    EmployeeProfileData,
    TaskDetails,
    TaskComment,
    EmployeeTask,
    EmployeeCircular
} from './staff-actions'
import { getAdminCircularsAction, getStaffCircularsAction, Circular } from './circular-actions'

// SWR Configuration - Optimized for better caching
const swrConfig = {
    revalidateOnFocus: false,      // Don't refetch on focus to prevent unnecessary requests
    revalidateOnReconnect: false,  // Don't refetch on reconnect
    revalidateIfStale: false,      // Don't refetch if data exists
    dedupingInterval: 120000,      // 2 minutes - prevents duplicate requests
    focusThrottleInterval: 120000, // Throttle focus revalidation to 2 minutes
    errorRetryCount: 3,
    refreshInterval: 0,            // No auto refresh by default
    keepPreviousData: true,        // Keep showing old data while fetching
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
        swrConfig
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

// Hook for admin tasks with full assignments (Admin)
export function useAdminTasksWithAssignments(userId: string | null) {
    return useSWR<AdminTaskWithAssignments[]>(
        userId ? ['admin-tasks-assignments', userId] : null,
        () => getAdminTasksWithAssignmentsAction(userId!),
        swrConfig
    )
}

// Hook for notifications with pagination support
export function useNotifications(userId: string | null, limit: number = 50) {
    return useSWR(
        userId ? ['notifications', userId, limit] : null,
        () => getNotificationsAction(userId!, limit),
        { ...swrConfig, refreshInterval: 120000, revalidateOnFocus: true } // Refresh every 2 minutes, revalidate on focus for notifications
    )
}

// Hook for admin circulars with pagination support
export function useAdminCirculars(userId: string | null, limit: number = 30) {
    return useSWR<Circular[]>(
        userId ? ['admin-circulars', userId, limit] : null,
        () => getAdminCircularsAction(userId!, limit),
        swrConfig
    )
}

// Hook for staff circulars with pagination support
export function useStaffCirculars(userId: string | null, limit: number = 30) {
    return useSWR<StaffCircular[]>(
        userId ? ['staff-circulars', userId, limit] : null,
        () => getStaffCircularsAction(userId!, limit),
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

// Lightweight profile hook for initial load
export function useEmployeeProfileBasic(employeeId: string | null) {
    return useSWR(
        employeeId ? ['employee-profile-basic', employeeId] : null,
        () => getEmployeeProfileBasicAction(employeeId!),
        swrConfig
    )
}

// Separate hooks for lazy loading tasks and circulars
// Separate hooks for lazy loading tasks and circulars
export function useEmployeeTasks(employeeId: string | null, options?: any) {
    return useSWR<{ activeTasks: EmployeeTask[], completedTasks: EmployeeTask[] }>(
        employeeId ? ['employee-tasks', employeeId] : null,
        () => getEmployeeTasksAction(employeeId!),
        { ...swrConfig, ...options }
    )
}

export function useEmployeeCirculars(employeeId: string | null, options?: any) {
    return useSWR<EmployeeCircular[]>(
        employeeId ? ['employee-circulars', employeeId] : null,
        () => getEmployeeCircularsAction(employeeId!),
        { ...swrConfig, ...options }
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
        { ...swrConfig, refreshInterval: 30000 } // Reduced to 30 seconds to avoid excessive requests
    )
}

// ============== MUTATION HELPERS ==============

// These help invalidate cache after mutations
export const mutationKeys = {
    employees: 'employees-with-stats',
    assignedTasks: (userId: string) => ['assigned-tasks', userId],
    createdTasks: (userId: string) => ['created-tasks', userId],
    adminTasksWithAssignments: (userId: string) => ['admin-tasks-assignments', userId],
    notifications: (userId: string, limit: number = 50) => ['notifications', userId, limit],
    adminCirculars: (userId: string, limit: number = 30) => ['admin-circulars', userId, limit],
    staffCirculars: (userId: string, limit: number = 30) => ['staff-circulars', userId, limit],
    employeeProfile: (employeeId: string) => ['employee-profile', employeeId],
    employeeProfileBasic: (employeeId: string) => ['employee-profile-basic', employeeId],
    employeeTasks: (employeeId: string) => ['employee-tasks', employeeId],
    employeeCirculars: (employeeId: string) => ['employee-circulars', employeeId],
    taskDetails: (taskId: string) => ['task-details', taskId],
    taskComments: (taskId: string) => ['task-comments', taskId],
}

// Helper function to create SWR config with manual refresh
export function createRefreshableConfig(intervalMs: number = 0) {
    return {
        ...swrConfig,
        refreshInterval: intervalMs,
        revalidateOnMount: true, // Always fetch on mount
    }
}

// ============== EMPLOYEE TASKS HOOKS ==============

import { getAllEmployeeTasksAction, getUserEmployeeTasksAction, EmployeeTask as EmployeeTaskType } from './employee-task-actions'

// Hook for employee tasks (between employees)
export function useEmployeeTasksList(userId: string | null, isAdmin: boolean) {
    return useSWR<EmployeeTaskType[]>(
        userId ? ['employee-tasks-list', userId, isAdmin] : null,
        () => isAdmin ? getAllEmployeeTasksAction() : getUserEmployeeTasksAction(userId!),
        swrConfig
    )
}
