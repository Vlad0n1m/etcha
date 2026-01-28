import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/organizer", "/admin"]

// Routes that require specific roles
const roleRoutes = {
    "/organizer": ["ORGANIZER", "ADMIN"],
    "/admin": ["ADMIN"],
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Check if route is protected
    const isProtectedRoute = protectedRoutes.some((route) =>
        pathname.startsWith(route)
    )

    if (!isProtectedRoute) {
        return NextResponse.next()
    }

    // Get session
    const session = await auth()

    // Redirect to login if not authenticated
    if (!session?.user) {
        const loginUrl = new URL("/auth/login", request.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
            const userRole = session.user.role

            if (!allowedRoles.includes(userRole)) {
                // Redirect to dashboard if user doesn't have required role
                return NextResponse.redirect(new URL("/dashboard", request.url))
            }

            // For organizer routes, also check if organizer is approved
            if (route === "/organizer" && userRole === "ORGANIZER") {
                const organizerStatus = session.user.organizerStatus

                if (organizerStatus !== "APPROVED") {
                    // Redirect to pending page if not approved
                    return NextResponse.redirect(
                        new URL("/dashboard/organizer/pending", request.url)
                    )
                }
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api routes (handled separately)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc.)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)",
    ],
}
