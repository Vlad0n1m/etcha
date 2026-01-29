import { Suspense } from "react"
import Link from "next/link"
import Image from "next/image"
import LoginForm from "@/components/auth/LoginForm"
import SocialLoginButtons from "@/components/auth/SocialLoginButtons"
import { ChevronLeft } from "lucide-react"

interface LoginPageProps {
    searchParams: Promise<{ callbackUrl?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
    const params = await searchParams
    const callbackUrl = params.callbackUrl || "/dashboard"
    const error = params.error

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Back</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/logo.png"
                                alt="Etcha"
                                width={80}
                                height={80}
                                className="mx-auto"
                            />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 mt-4">Welcome back</h1>
                        <p className="text-gray-500 mt-2">Sign in to your account</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {error === "OAuthAccountNotLinked"
                                ? "This email is already linked to another account. Please sign in with the original method."
                                : error === "CredentialsSignin"
                                    ? "Invalid email or password"
                                    : "An error occurred. Please try again."}
                        </div>
                    )}

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        {/* Social Login */}
                        <Suspense fallback={<div className="h-24 animate-pulse bg-gray-100 rounded-xl" />}>
                            <SocialLoginButtons callbackUrl={callbackUrl} />
                        </Suspense>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">or continue with email</span>
                            </div>
                        </div>

                        {/* Email Login Form */}
                        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 rounded-xl" />}>
                            <LoginForm callbackUrl={callbackUrl} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    )
}
