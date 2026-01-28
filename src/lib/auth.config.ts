import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Twitter from "next-auth/providers/twitter"

/**
 * Edge-compatible auth configuration.
 * This config is used by middleware and doesn't include the Prisma adapter
 * or any Node.js-specific code that can't run in Edge Runtime.
 */
export const authConfig: NextAuthConfig = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
    providers: [
        // Credentials provider - authorize callback will be added in full auth.ts
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // In edge runtime, we skip the authorize callback
            // The full implementation is in auth.ts
            authorize: () => null,
        }),
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Twitter({
            clientId: process.env.AUTH_TWITTER_ID,
            clientSecret: process.env.AUTH_TWITTER_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const { pathname } = nextUrl

            // Routes that require authentication
            const protectedRoutes = ["/dashboard", "/organizer", "/admin"]

            // Check if route is protected
            const isProtectedRoute = protectedRoutes.some((route) =>
                pathname.startsWith(route)
            )

            if (isProtectedRoute && !isLoggedIn) {
                return false // Will redirect to signIn page
            }

            return true
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.walletAddress = user.walletAddress
            }

            // Handle session updates (e.g., after wallet linking)
            if (trigger === "update" && session) {
                if (session.walletAddress !== undefined) {
                    token.walletAddress = session.walletAddress
                }
                if (session.role !== undefined) {
                    token.role = session.role
                }
                if (session.organizerStatus !== undefined) {
                    token.organizerStatus = session.organizerStatus
                }
            }

            return token
        },
        session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.role = token.role
                session.user.walletAddress = token.walletAddress
                session.user.organizerStatus = token.organizerStatus
            }
            return session
        },
    },
}
