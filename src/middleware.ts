import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth.config"

// Create an edge-compatible auth instance using only the config (no Prisma adapter)
const { auth } = NextAuth(authConfig)

export default auth

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
