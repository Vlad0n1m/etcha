"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'
import DesktopSidebar from './DesktopSidebar'
import TopBanner from './TopBanner'

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
            <div className="bg-background min-h-screen">
                {children}
            </div>
        )
    }

    // All other pages get the standard navigation
    // Mobile: BottomNav only
    // Desktop: Floating sidebar + centered 720px container
    return (
        <div className="bg-background min-h-screen pt-[30px] lg:pt-[60px]">
            <TopBanner />
            <DesktopSidebar />
            {/* Centered container with max-width 720px on desktop */}
            <div className="lg:max-w-[720px] lg:mx-auto">
                {children}
            </div>
            <BottomNav />
        </div>
    )
}
