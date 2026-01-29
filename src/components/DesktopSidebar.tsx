"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Calendar, Repeat, User, Settings } from "lucide-react"

export default function DesktopSidebar() {
    const pathname = usePathname()
    const { data: session, status } = useSession()

    const navItems = [
        { href: "/", label: "Events", icon: Calendar },
        { href: "/resale", label: "Resale", icon: Repeat },
        { href: "/profile", label: "Profile", icon: User },
        { href: "/settings", label: "Settings", icon: Settings },
    ]

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/"
        return pathname?.startsWith(href)
    }

    // Floating island sidebar positioned to the left of the 720px container
    // Container is centered, so sidebar is at: calc(50% - 360px - 80px)
    return (
        <aside className="border-1 p-2 py-4 rounded-full hidden lg:flex fixed top-[60px] left-[calc(50%-360px-80px)] flex-col items-center z-50">
            {/* Logo */}
            <Link href="/" className="mb-6">
                <Image
                    src="/etcha.png"
                    alt="Etcha"
                    width={36}
                    height={36}
                    className="w-9 h-9"
                />
            </Link>

            {/* Navigation Items */}
            <nav className="flex flex-col items-center gap-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.href)
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${active
                                ? "border-1 text-gray-900 "
                                : "text-gray-400 hover:text-gray-900 hover:bg-white/80"
                                }`}
                            title={item.label}
                        >
                            <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
                            {/* Tooltip */}
                            <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            {/* User Avatar / Sign In */}
            <div className="mt-6">
                {status === "loading" ? (
                    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                ) : session?.user ? (
                    <Link
                        href="/profile"
                        className="block w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-lg hover:ring-gray-300 transition-all"
                        title={session.user.name || session.user.email || "Profile"}
                    >
                        {session.user.image ? (
                            <Image
                                src={session.user.image}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                                {session.user.name?.[0]?.toUpperCase() ||
                                    session.user.email?.[0]?.toUpperCase() ||
                                    "U"}
                            </div>
                        )}
                    </Link>
                ) : (
                    <Link
                        href="/auth/login"
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-gray-400 hover:text-gray-900 shadow-lg transition-colors"
                        title="Sign In"
                    >
                        <User className="w-5 h-5" />
                    </Link>
                )}
            </div>
        </aside>
    )
}
