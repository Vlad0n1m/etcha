/**
 * NFT Metadata utilities for creating ticket metadata
 * Following Metaplex Token Metadata Standard
 */

export interface NFTMetadataInput {
    eventName: string
    eventDescription: string
    eventImage: string
    eventDate: string // "2024-03-15"
    eventTime: string // "19:00"
    location: string // "Barcelona, Catalunya"
    category: string // "Blockchain"
    organizerName: string
    organizerAvatar: string
    organizerDescription?: string
    ticketNumber: number // Номер билета в коллекции (1, 2, 3, ...)
    organizerWallet: string // Wallet адрес организатора для creators
}

export interface NFTAttribute {
    trait_type: string
    value: string | number
}

export interface NFTMetadataOutput {
    name: string
    symbol: string
    description: string
    image: string
    attributes: NFTAttribute[]
    properties: {
        category: string
        creators: Array<{
            address: string
            share: number
        }>
    }
}

/**
 * Create metadata for a single ticket NFT
 */
export function createTicketMetadata(input: NFTMetadataInput): NFTMetadataOutput {
    const {
        eventName,
        eventDescription,
        eventImage,
        eventDate,
        eventTime,
        location,
        category,
        organizerName,
        organizerAvatar,
        organizerDescription,
        ticketNumber,
        organizerWallet,
    } = input

    // Format ticket name
    const ticketName = `${eventName} - Ticket #${ticketNumber}`

    // Create attributes array
    const attributes: NFTAttribute[] = [
        {
            trait_type: 'Event Date',
            value: eventDate,
        },
        {
            trait_type: 'Event Time',
            value: eventTime,
        },
        {
            trait_type: 'Location',
            value: location,
        },
        {
            trait_type: 'Category',
            value: category,
        },
        {
            trait_type: 'Organizer Name',
            value: organizerName,
        },
        {
            trait_type: 'Organizer Avatar',
            value: organizerAvatar,
        },
        {
            trait_type: 'Ticket Number',
            value: ticketNumber,
        },
        {
            trait_type: 'Ticket Type',
            value: 'NFT Event Ticket',
        },
    ]

    // Add organizer description if provided
    if (organizerDescription) {
        attributes.push({
            trait_type: 'Organizer',
            value: organizerDescription,
        })
    }

    return {
        name: ticketName,
        symbol: 'TICKET',
        description: eventDescription,
        image: eventImage,
        attributes,
        properties: {
            category: 'event-ticket',
            creators: [
                {
                    address: organizerWallet,
                    share: 100,
                },
            ],
        },
    }
}

/**
 * Create collection metadata (for the NFT collection itself)
 */
export function createCollectionMetadata(input: {
    name: string
    symbol: string
    description: string
    image: string
    organizerWallet: string
}): Omit<NFTMetadataOutput, 'attributes'> {
    return {
        name: input.name,
        symbol: input.symbol,
        description: input.description,
        image: input.image,
        properties: {
            category: 'event-collection',
            creators: [
                {
                    address: input.organizerWallet,
                    share: 100,
                },
            ],
        },
    }
}

/**
 * Generate metadata for all tickets in a collection
 */
export function generateAllTicketMetadata(
    baseInput: Omit<NFTMetadataInput, 'ticketNumber'>,
    totalSupply: number
): NFTMetadataOutput[] {
    const allMetadata: NFTMetadataOutput[] = []

    for (let i = 1; i <= totalSupply; i++) {
        const metadata = createTicketMetadata({
            ...baseInput,
            ticketNumber: i,
        })
        allMetadata.push(metadata)
    }

    return allMetadata
}

