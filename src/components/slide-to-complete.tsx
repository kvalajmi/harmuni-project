'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface SlideToCompleteProps {
    onComplete: () => void | Promise<void>
    text?: string
    completedText?: string
    disabled?: boolean
    variant?: 'close' | 'reopen'
}

export function SlideToComplete({
    onComplete,
    text = 'اسحب لإغلاق المهمة',
    completedText = 'تم!',
    disabled = false,
    variant = 'close'
}: SlideToCompleteProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [translateX, setTranslateX] = useState(0)
    const [isCompleted, setIsCompleted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLDivElement>(null)
    const startXRef = useRef(0)
    const maxSlideRef = useRef(0)

    // Calculate max slide distance on mount and resize
    useEffect(() => {
        const updateMaxSlide = () => {
            if (containerRef.current && thumbRef.current) {
                const containerWidth = containerRef.current.offsetWidth
                const thumbWidth = thumbRef.current.offsetWidth
                maxSlideRef.current = containerWidth - thumbWidth - 8 // 8px padding
            }
        }
        updateMaxSlide()
        window.addEventListener('resize', updateMaxSlide)
        return () => window.removeEventListener('resize', updateMaxSlide)
    }, [])

    const handleStart = useCallback((clientX: number) => {
        if (disabled || isCompleted || isLoading) return
        setIsDragging(true)
        startXRef.current = clientX
    }, [disabled, isCompleted, isLoading])

    const handleMove = useCallback((clientX: number) => {
        if (!isDragging) return

        // RTL: moving left means negative deltaX, but we want positive translateX
        const deltaX = startXRef.current - clientX
        const clampedTranslate = Math.max(0, Math.min(deltaX, maxSlideRef.current))
        setTranslateX(clampedTranslate)
    }, [isDragging])

    const handleEnd = useCallback(async () => {
        if (!isDragging) return
        setIsDragging(false)

        // Check if we've slid past 90% threshold
        const threshold = maxSlideRef.current * 0.9

        if (translateX >= threshold) {
            // Complete!
            setTranslateX(maxSlideRef.current)
            setIsLoading(true)

            try {
                await onComplete()
                setIsCompleted(true)
            } catch (error) {
                console.error('Slide action failed:', error)
                // Reset on error
                setTranslateX(0)
            } finally {
                setIsLoading(false)
            }
        } else {
            // Snap back with animation
            setTranslateX(0)
        }
    }, [isDragging, translateX, onComplete])

    // Mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        handleStart(e.clientX)
    }

    const handleMouseMove = useCallback((e: MouseEvent) => {
        handleMove(e.clientX)
    }, [handleMove])

    const handleMouseUp = useCallback(() => {
        handleEnd()
    }, [handleEnd])

    // Touch events
    const handleTouchStart = (e: React.TouchEvent) => {
        handleStart(e.touches[0].clientX)
    }

    const handleTouchMove = useCallback((e: TouchEvent) => {
        e.preventDefault() // Prevent scrolling while sliding
        handleMove(e.touches[0].clientX)
    }, [handleMove])

    const handleTouchEnd = useCallback(() => {
        handleEnd()
    }, [handleEnd])

    // Add global event listeners when dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
            window.addEventListener('touchmove', handleTouchMove, { passive: false })
            window.addEventListener('touchend', handleTouchEnd)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('touchend', handleTouchEnd)
        }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

    const progress = maxSlideRef.current > 0 ? translateX / maxSlideRef.current : 0

    // Color variants
    const colors = variant === 'close'
        ? {
            bg: 'bg-gradient-to-l from-slate-700 to-slate-600',
            thumb: 'bg-gradient-to-r from-slate-500 to-slate-400',
            thumbActive: 'from-green-500 to-green-400',
            text: 'text-slate-300',
            progressBg: 'from-green-500/40 to-transparent',
            icon: 'text-white'
        }
        : {
            bg: 'bg-gradient-to-l from-green-700/30 to-green-600/30',
            thumb: 'bg-gradient-to-r from-green-500 to-green-400',
            thumbActive: 'from-amber-500 to-amber-400',
            text: 'text-green-400',
            progressBg: 'from-amber-500/40 to-transparent',
            icon: 'text-white'
        }

    return (
        <div
            ref={containerRef}
            className={`
                relative h-14 rounded-xl overflow-hidden select-none
                ${colors.bg}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
        >
            {/* Progress fill - grows from right to left */}
            <div
                className={`
                    absolute inset-y-0 left-0 
                    bg-gradient-to-l ${colors.progressBg}
                    transition-all duration-100
                `}
                style={{ width: `${progress * 100}%` }}
            />

            {/* Text */}
            <div className={`
                absolute inset-0 flex items-center justify-center
                ${colors.text} font-medium text-sm
                transition-opacity duration-200
                pointer-events-none
                ${progress > 0.3 ? 'opacity-0' : 'opacity-100'}
            `}>
                {isCompleted ? completedText : text}
            </div>

            {/* Arrows hint - on LEFT side pointing left */}
            {!isCompleted && !isLoading && (
                <div className={`
                    absolute left-4 top-1/2 -translate-y-1/2 flex gap-0.5
                    ${colors.text}
                    transition-opacity duration-200
                    pointer-events-none
                    ${progress > 0.1 ? 'opacity-0' : 'opacity-60'}
                `}>
                    <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <svg className="w-4 h-4 animate-pulse" style={{ animationDelay: '150ms' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <svg className="w-4 h-4 animate-pulse" style={{ animationDelay: '300ms' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </div>
            )}

            {/* Sliding Thumb - starts on RIGHT, slides LEFT */}
            <div
                ref={thumbRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`
                    absolute top-1 bottom-1 right-1 w-16 rounded-lg
                    flex items-center justify-center
                    ${isCompleted
                        ? 'bg-gradient-to-r from-green-500 to-green-400'
                        : progress > 0.9
                            ? `bg-gradient-to-r ${colors.thumbActive}`
                            : colors.thumb
                    }
                    shadow-lg
                    ${isDragging ? 'scale-105' : 'scale-100'}
                    ${!isDragging ? 'transition-all duration-300 ease-out' : 'transition-transform duration-75'}
                    cursor-grab active:cursor-grabbing
                    touch-none
                `}
                style={{
                    transform: `translateX(-${translateX}px) ${isDragging ? 'scale(1.05)' : 'scale(1)'}`,
                }}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isCompleted ? (
                    <svg className={`w-6 h-6 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className={`w-6 h-6 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                )}
            </div>
        </div>
    )
}
