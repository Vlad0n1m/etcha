interface TicketMetadata {
    eventId: string
    orderId: string
    tokenId: number
    eventTitle: string
    eventDate: string
    eventTime: string
    ticketNumber: number
}

export function createTicketMetadata(params: TicketMetadata) {
    const metadata = {
        name: `${params.eventTitle} - Ticket #${params.ticketNumber}`,
        symbol: 'ETCHA',
        description: `NFT ticket for ${params.eventTitle} on ${params.eventDate} at ${params.eventTime}`,
        image: 'https://example.com/ticket-image.png', // In a real implementation, this would be the event image
        attributes: [
            {
                trait_type: 'Event ID',
                value: params.eventId
            },
            {
                trait_type: 'Order ID',
                value: params.orderId
            },
            {
                trait_type: 'Token ID',
                value: params.tokenId
            },
            {
                trait_type: 'Event Title',
                value: params.eventTitle
            },
            {
                trait_type: 'Event Date',
                value: params.eventDate
            },
            {
                trait_type: 'Event Time',
                value: params.eventTime
            },
            {
                trait_type: 'Ticket Number',
                value: params.ticketNumber
            },
            {
                trait_type: 'Valid',
                value: true
            },
            {
                trait_type: 'Used',
                value: false
            }
        ],
        properties: {
            category: 'tickets',
            creators: [
                {
                    address: 'EtchaPlatform', // Platform address
                    share: 100
                }
            ]
        },
        external_url: `https://etcha.example.com/events/${params.eventId}`
    }

    return metadata
}

export function uploadMetadataToIPFS(metadata: any): Promise<string> {
    // In a real implementation, you would:
    // 1. Upload the metadata to IPFS (using Pinata, Arweave, etc.)
    // 2. Return the IPFS URI

    // For this demo, we'll return a mock URI
    return Promise.resolve(`ipfs://mock-metadata-${Date.now()}`)
}
