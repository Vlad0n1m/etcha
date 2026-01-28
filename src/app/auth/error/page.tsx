import Link from "next/link"
import Image from "next/image"
import { AlertCircle, ChevronLeft } from "lucide-react"

interface ErrorPageProps {
    searchParams: Promise<{ error?: string }>
}

const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification link may have expired or already been used.",
    OAuthSignin: "Error occurred during OAuth sign in.",
    OAuthCallback: "Error occurred during OAuth callback.",
    OAuthCreateAccount: "Could not create OAuth account.",
    EmailCreateAccount: "Could not create email account.",
    Callback: "Error occurred during callback.",
    OAuthAccountNotLinked: "This email is already linked to another account. Please sign in with the original method.",
    EmailSignin: "Error sending email for sign in.",
    CredentialsSignin: "Invalid credentials.",
    SessionRequired: "Please sign in to access this page.",
    Default: "An unexpected error occurred.",
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
    const params = await searchParams
    const error = params.error || "Default"
    const errorMessage = errorMessages[error] || errorMessages.Default

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Back to Home</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-md text-center">
                    {/* Logo */}
                    <Link href="/" className="inline-block mb-8">
                        <Image
                            src="/logo.png"
                            alt="Etcha"
                            width={80}
                            height={80}
                            className="mx-auto"
                        />
                    </Link>

                    {/* Error Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>

                        <h1 className="text-xl font-bold text-gray-900 mb-2">
                            Authentication Error
                        </h1>

                        <p className="text-gray-500 mb-6">
                            {errorMessage}
                        </p>

                        <div className="space-y-3">
                            <Link
                                href="/auth/login"
                                className="block w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </Link>

                            <Link
                                href="/"
                                className="block w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                Go to Home
                            </Link>
                        </div>
                    </div>

                    {/* Help Text */}
                    <p className="text-sm text-gray-500 mt-6">
                        If you continue to have problems, please{" "}
                        <a href="mailto:support@etcha.io" className="text-primary hover:underline">
                            contact support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
