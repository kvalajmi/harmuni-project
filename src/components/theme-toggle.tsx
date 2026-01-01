'use client'

import * as React from 'react'
import { useTheme } from './theme-provider'
import { Button } from './ui/button'

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [isOpen, setIsOpen] = React.useState(false)
    const dropdownRef = React.useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const options = [
        { value: 'light' as const, label: 'فاتح', icon: '☀️' },
        { value: 'dark' as const, label: 'داكن', icon: '🌙' },
        { value: 'system' as const, label: 'تلقائي', icon: '💻' },
    ]

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="relative h-9 w-9 rounded-full transition-all duration-300 hover:bg-accent"
                aria-label="تبديل المظهر"
            >
                {/* Sun Icon */}
                <svg
                    className={`h-5 w-5 transition-all duration-500 ${resolvedTheme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ position: 'absolute' }}
                >
                    <circle cx="12" cy="12" r="4" strokeWidth="2" />
                    <path
                        strokeLinecap="round"
                        strokeWidth="2"
                        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                    />
                </svg>

                {/* Moon Icon */}
                <svg
                    className={`h-5 w-5 transition-all duration-500 ${resolvedTheme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
                        }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ position: 'absolute' }}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            </Button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 min-w-[120px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => {
                                setTheme(option.value)
                                setIsOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${theme === option.value ? 'bg-accent font-medium' : ''
                                }`}
                        >
                            <span>{option.icon}</span>
                            <span>{option.label}</span>
                            {theme === option.value && (
                                <svg className="mr-auto h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
