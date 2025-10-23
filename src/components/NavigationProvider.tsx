"use client"

import React from 'react'
import BottomNav from './BottomNav'

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-gray-50">
            {children}
            <BottomNav />
        </div>
    )
}
