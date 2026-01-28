import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Twitter from "next-auth/providers/twitter"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import type { Role } from "@/generated/prisma"

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email?: string | null
            name?: string | null
            image?: string | null
            role: Role
            walletAddress?: string | null
            organizerStatus?: string | null
        }
    }

    interface User {
        role: Role
        walletAddress?: string | null
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: Role
        walletAddress?: string | null
        organizerStatus?: string | null
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/auth/login",
        error: "/auth/error",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const email = credentials.email as string
                const password = credentials.password as string

                const user = await prisma.user.findUnique({
                    where: { email },
                    include: {
                        organizer: {
                            select: { status: true },
                        },
                    },
                })

                if (!user || !user.password) {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(password, user.password)

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    walletAddress: user.walletAddress,
                }
            },
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
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.walletAddress = user.walletAddress
            }

            // Fetch organizer status if user is organizer
            if (token.id && token.role === "ORGANIZER") {
                const organizer = await prisma.organizer.findUnique({
                    where: { userId: token.id },
                    select: { status: true },
                })
                token.organizerStatus = organizer?.status || null
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
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id
                session.user.role = token.role
                session.user.walletAddress = token.walletAddress
                session.user.organizerStatus = token.organizerStatus
            }
            return session
        },
        async signIn({ user, account }) {
            // For OAuth providers, ensure user has default role
            if (account?.provider !== "credentials") {
                const existingUser = await prisma.user.findUnique({
                    where: { id: user.id },
                })
                if (existingUser && !existingUser.role) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { role: "USER" },
                    })
                }
            }
            return true
        },
    },
})

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}
