import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hashPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, name } = body

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "User with this email already exists" },
                { status: 400 }
            )
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password)

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name || email.split("@")[0],
                role: "USER",
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        })

        return NextResponse.json({
            success: true,
            user,
            message: "Account created successfully",
        })
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Failed to create account" },
            { status: 500 }
        )
    }
}
