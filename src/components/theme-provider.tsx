'use client'

import * as React from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

interface ThemeProviderState {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'dark' | 'light'
}

const ThemeProviderContext = React.createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'ops-room-theme',
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = React.useState<Theme>(defaultTheme)
    const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('light')
    const [mounted, setMounted] = React.useState(false)

    // Load theme from localStorage on mount
    React.useEffect(() => {
        const savedTheme = localStorage.getItem(storageKey) as Theme | null
        if (savedTheme) {
            setTheme(savedTheme)
        }
        setMounted(true)
    }, [storageKey])

    // Apply theme to document
    React.useEffect(() => {
        if (!mounted) return

        const root = window.document.documentElement
        root.classList.remove('light', 'dark')

        let effectiveTheme: 'dark' | 'light'

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
            effectiveTheme = systemTheme
        } else {
            effectiveTheme = theme
        }

        root.classList.add(effectiveTheme)
        setResolvedTheme(effectiveTheme)

        // Update meta theme-color for mobile
        const metaTheme = document.querySelector('meta[name="theme-color"]')
        if (metaTheme) {
            metaTheme.setAttribute('content', effectiveTheme === 'dark' ? '#0a0a0a' : '#ffffff')
        }
    }, [theme, mounted])

    // Listen for system preference changes
    React.useEffect(() => {
        if (theme !== 'system') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        const handleChange = (e: MediaQueryListEvent) => {
            const root = window.document.documentElement
            root.classList.remove('light', 'dark')
            const newTheme = e.matches ? 'dark' : 'light'
            root.classList.add(newTheme)
            setResolvedTheme(newTheme)
        }

        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [theme])

    const handleSetTheme = React.useCallback((newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme)
        setTheme(newTheme)
    }, [storageKey])

    const value = React.useMemo(() => ({
        theme,
        setTheme: handleSetTheme,
        resolvedTheme,
    }), [theme, handleSetTheme, resolvedTheme])

    // Prevent flash of incorrect theme
    if (!mounted) {
        return (
            <ThemeProviderContext.Provider value={{ theme: 'system', setTheme: () => { }, resolvedTheme: 'light' }}>
                {children}
            </ThemeProviderContext.Provider>
        )
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export function useTheme() {
    const context = React.useContext(ThemeProviderContext)

    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }

    return context
}
