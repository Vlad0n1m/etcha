"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import {
    Calendar,
    Repeat,
    User,
    LogOut,
    Settings,
    ChevronDown,
    Wallet,
    Shield,
} from "lucide-react"

export default function DesktopNavbar() {
    const pathname = usePathname()
    const { data: session, status } = useSession()
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const navLinks = [
        { href: "/", label: "Events", icon: Calendar },
        { href: "/resale", label: "Resale", icon: Repeat },
    ]

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/"
        return pathname.startsWith(href)
    }

    return (
        <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/etcha.png"
                            alt="Etcha"
                            width={36}
                            height={36}
                            className="w-9 h-9"
                        />
                        <span className="font-bold text-xl text-gray-900">Etcha</span>
                    </Link>

                    {/* Navigation Links */}
                    <nav className="flex items-center gap-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon
                            const active = isActive(link.href)
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {link.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Right side - Auth */}
                    <div className="flex items-center gap-3">
                        {/* Devnet badge */}
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold">
                            Devnet
                        </span>

                        {status === "loading" ? (
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                        ) : session?.user ? (
                            /* Logged in - Profile dropdown */
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                        {session.user.name?.[0]?.toUpperCase() ||
                                            session.user.email?.[0]?.toUpperCase() ||
                                            "U"}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                                        {session.user.name || session.user.email?.split("@")[0]}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>

                                {/* Dropdown menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                        {/* User info */}
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {session.user.name || "User"}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {session.user.email}
                                            </p>
                                            {session.user.role && session.user.role !== "USER" && (
                                                <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                                    <Shield className="w-3 h-3" />
                                                    {session.user.role}
                                                </span>
                                            )}
                                        </div>

                                        {/* Links */}
                                        <div className="py-1">
                                            <Link
                                                href="/profile"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <User className="w-4 h-4" />
                                                My Profile
                                            </Link>
                                            <Link
                                                href="/settings"
                                                onClick={() => setIsDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Link>
                                            {session.user.walletAddress ? (
                                                <div className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500">
                                                    <Wallet className="w-4 h-4" />
                                                    <span className="font-mono text-xs">
                                                        {session.user.walletAddress.slice(0, 4)}...
                                                        {session.user.walletAddress.slice(-4)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <Link
                                                    href="/settings?tab=wallet"
                                                    onClick={() => setIsDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-gray-50"
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                    Link Wallet
                                                </Link>
                                            )}
                                        </div>

                                        {/* Logout */}
                                        <div className="border-t border-gray-100 pt-1">
                                            <button
                                                onClick={() => signOut({ callbackUrl: "/" })}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Not logged in - Login/Register buttons */
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/auth/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/auth/register"
                                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
