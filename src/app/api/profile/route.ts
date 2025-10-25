import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import jwt from 'jsonwebtoken'

const updateProfileSchema = z.object({
    nickname: z.string().min(1).max(50).optional(),
    avatar: z.string().url().optional(),
    bio: z.string().max(500).optional()
})

export async function GET(request: NextRequest) {
    try {
        // Get authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthenticated' },
                { status: 401 }
            )
        }

        // Verify JWT token
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

        // Get user profile
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: {
                profile: true
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            id: user.id,
            walletAddress: user.walletAddress,
            profile: user.profile ? {
                nickname: user.profile.nickname,
                avatar: user.profile.avatar,
                bio: user.profile.bio
            } : null
        })
    } catch (error) {
        console.error('Error fetching profile:', error)
        return NextResponse.json(
            { error: 'Failed to fetch profile' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        // Get authorization header
        const authHeader = request.headers.get('authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthenticated' },
                { status: 401 }
            )
        }

        // Verify JWT token
        const token = authHeader.substring(7)
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

        const body = await request.json()
        const validatedData = updateProfileSchema.parse(body)

        // Update or create profile
        const profile = await prisma.profile.upsert({
            where: { userId: decoded.userId },
            update: validatedData,
            create: {
                userId: decoded.userId,
                ...validatedData
            }
        })

        return NextResponse.json(profile)
    } catch (error) {
        console.error('Error updating profile:', error)
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        )
    }
}
