import { NextResponse } from "next/server"
import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export async function GET() {
    try {
        const categories = await prisma.category.findMany({
            orderBy: {
                name: "asc",
            },
        })

        return NextResponse.json({
            success: true,
            categories,
        })
    } catch (error) {
        console.error("Error fetching categories:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch categories",
            },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, value, icon } = body

        if (!name || !value) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Name and value are required",
                },
                { status: 400 }
            )
        }

        const category = await prisma.category.create({
            data: {
                name,
                value,
                icon: icon || null,
            },
        })

        return NextResponse.json({
            success: true,
            category,
        })
    } catch (error) {
        console.error("Error creating category:", error)
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to create category",
            },
            { status: 500 }
        )
    }
}

