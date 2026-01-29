"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2, User, LogIn, UserPlus } from "lucide-react"
import Link from "next/link"

// Auth prompt component for non-authenticated users
function AuthPrompt() {
    return (
        <div className="min-h-screen bg-background">
            <div className="flex items-center justify-center min-h-screen px-4 pb-20">
                <div className="w-full max-w-md text-center">
                    {/* Icon */}
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-purple-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">
                        Войдите в аккаунт
                    </h1>
                    <p className="text-gray-500 mb-8">
                        Создайте аккаунт или войдите, чтобы просматривать профиль, билеты и многое другое.
                    </p>

                    {/* Auth buttons */}
                    <div className="space-y-3">
                        <Link
                            href="/auth/login"
                            className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors"
                        >
                            <LogIn className="w-5 h-5" />
                            Войти
                        </Link>
                        <Link
                            href="/auth/register"
                            className="flex items-center justify-center gap-2 w-full bg-white text-gray-900 font-semibold py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            Создать аккаунт
                        </Link>
                    </div>

                    {/* Divider */}
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-gray-50 text-gray-500">или</span>
                        </div>
                    </div>

                    {/* Browse events */}
                    <Link
                        href="/"
                        className="text-purple-600 font-medium hover:text-purple-700 transition-colors"
                    >
                        Смотреть события без аккаунта
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function ProfileRedirectPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "authenticated" && session?.user?.id) {
            router.replace(`/profile/${session.user.id}`)
        }
    }, [status, session, router])

    // Show loading state while checking auth
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-500">Загрузка...</p>
                </div>
            </div>
        )
    }

    // Show auth prompt if not logged in
    if (!session?.user) {
        return <AuthPrompt />
    }

    // Show loading while redirecting
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500">Переход в профиль...</p>
            </div>
        </div>
    )
}
