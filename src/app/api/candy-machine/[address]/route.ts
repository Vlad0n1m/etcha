import { NextRequest, NextResponse } from 'next/server'
import { getCandyMachineData } from '@/lib/services/CandyMachineService'

/**
 * GET /api/candy-machine/[address]
 * 
 * Get Candy Machine data including availability, price, and guards
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    try {
        const { address } = await params

        if (!address) {
            return NextResponse.json(
                { success: false, message: 'Candy Machine address is required' },
                { status: 400 }
            )
        }

        console.log(`Fetching Candy Machine data: ${address}`)

        const data = await getCandyMachineData(address)

        return NextResponse.json({
            success: true,
            address,
            ...data,
        })
    } catch (error: any) {
        console.error('Error fetching Candy Machine data:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Failed to fetch Candy Machine data',
                error: error.message || String(error),
            },
            { status: 500 }
        )
    }
}

