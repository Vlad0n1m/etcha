/**
 * Migration script to create TicketType records for existing events
 * and link existing tickets to them.
 * 
 * Run with: npx ts-node prisma/migrations/migrate-ticket-types.ts
 */

import { PrismaClient } from "../../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function main() {
    console.log("Starting migration: Creating TicketTypes for existing events...")

    // Get all events that don't have ticket types yet
    const events = await prisma.event.findMany({
        where: {
            ticketTypes: {
                none: {},
            },
        },
        select: {
            id: true,
            title: true,
            price: true,
            ticketsAvailable: true,
            ticketsSold: true,
        },
    })

    console.log(`Found ${events.length} events without ticket types`)

    for (const event of events) {
        console.log(`Processing event: ${event.title} (${event.id})`)

        // Create a "Standard" ticket type with the existing price and quantity
        const ticketType = await prisma.ticketType.create({
            data: {
                eventId: event.id,
                name: "Standard",
                price: event.price,
                quantity: event.ticketsAvailable,
                sold: event.ticketsSold,
                sortOrder: 0,
                description: null,
            },
        })

        console.log(`  Created TicketType: ${ticketType.id}`)

        // Update all existing tickets for this event to reference the new ticket type
        const updatedTickets = await prisma.ticket.updateMany({
            where: {
                eventId: event.id,
                ticketTypeId: null,
            },
            data: {
                ticketTypeId: ticketType.id,
            },
        })

        console.log(`  Updated ${updatedTickets.count} tickets`)
    }

    console.log("\nMigration completed successfully!")
}

main()
    .catch((e) => {
        console.error("Migration failed:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
