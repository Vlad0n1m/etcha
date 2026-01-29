import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Clock, ChevronLeft, Mail } from "lucide-react"

export default async function OrganizerPendingPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/auth/login")
    }

    // If approved, redirect to dashboard
    if (session.user.organizerStatus === "APPROVED") {
        redirect("/dashboard")
    }

    // If not an organizer, redirect to request page
    if (session.user.role !== "ORGANIZER") {
        redirect("/dashboard/organizer/request")
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        <span className="text-sm font-medium">Dashboard</span>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-10 h-10 text-yellow-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Request Pending
                    </h1>

                    <p className="text-gray-500 mb-6">
                        Your organizer request is being reviewed by our team.
                        This usually takes 1-2 business days.
                    </p>

                    {session.user.organizerStatus === "REJECTED" && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                            <p className="text-sm font-medium text-red-700 mb-1">
                                Request Rejected
                            </p>
                            <p className="text-sm text-red-600">
                                Unfortunately, your request was not approved. Please contact support for more information.
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <a
                            href="mailto:support@etcha.io"
                            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <Mail className="w-5 h-5" />
                            Contact Support
                        </a>

                        <Link
                            href="/dashboard"
                            className="block w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>

                {/* FAQ */}
                <div className="mt-6 space-y-4">
                    <h2 className="font-semibold text-gray-900">Frequently Asked Questions</h2>

                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="font-medium text-gray-900 mb-1">How long does approval take?</h3>
                        <p className="text-sm text-gray-500">
                            Most requests are reviewed within 1-2 business days.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="font-medium text-gray-900 mb-1">What if I'm rejected?</h3>
                        <p className="text-sm text-gray-500">
                            You can contact support to understand why and potentially reapply with updated information.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <h3 className="font-medium text-gray-900 mb-1">Can I still buy tickets?</h3>
                        <p className="text-sm text-gray-500">
                            Yes! You can browse events and purchase tickets while waiting for approval.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
