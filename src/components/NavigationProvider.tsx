"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import DesktopNavbar from './DesktopNavbar'

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const isLandingPage = pathname === '/landing'

    // Pages that handle their own navigation (auth pages only)
    const isAuthPage = pathname?.startsWith('/auth')

    if (isLandingPage) {
        return <>{children}</>
    }

    // Auth pages have their own layout (no navigation)
    if (isAuthPage) {
        return (
            <div className="bg-gray-50 min-h-screen">
                {children}
            </div>
        )
    }

    // All other pages get the standard navigation
    return (
        <div className="bg-gray-50 min-h-screen">
            <DesktopNavbar />
            {/* Add top padding for desktop navbar */}
            <div className="md:pt-16">
                {children}
            </div>
            <BottomNav />
        </div>
    )
}
