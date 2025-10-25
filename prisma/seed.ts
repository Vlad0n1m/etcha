import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
    // Create categories
    const categories = await Promise.all([
        prisma.category.create({
            data: {
                name: 'All',
                value: 'all',
                icon: 'Globe'
            }
        }),
        prisma.category.create({
            data: {
                name: 'Blockchain',
                value: 'blockchain',
                icon: 'Code'
            }
        }),
        prisma.category.create({
            data: {
                name: 'AI/ML',
                value: 'ai/ml',
                icon: 'Brain'
            }
        }),
        prisma.category.create({
            data: {
                name: 'Web3',
                value: 'web3',
                icon: 'Network'
            }
        }),
        prisma.category.create({
            data: {
                name: 'Development',
                value: 'development',
                icon: 'Code2'
            }
        }),
        prisma.category.create({
            data: {
                name: 'Marketing',
                value: 'marketing',
                icon: 'Megaphone'
            }
        }),
        prisma.category.create({
            data: {
                name: 'Community',
                value: 'community',
                icon: 'Users'
            }
        })
    ])

    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.value] = cat.id
        return acc
    }, {} as Record<string, string>)

    // Create organizers first
    const organizers = [
        {
            companyName: 'Arcium',
            description: 'Leading blockchain privacy solutions provider',
            avatar: '/logo.png',
            website: 'https://arcium.com',
            email: 'contact@arcium.com',
            isVerified: true
        },
        {
            companyName: 'Crypto Ventures',
            description: 'Blockchain security experts and consultants',
            avatar: '/logo.png',
            website: 'https://cryptoventures.com',
            email: 'info@cryptoventures.com',
            isVerified: true
        },
        {
            companyName: 'DataScience Pro',
            description: 'AI and ML research organization',
            avatar: '/logo.png',
            website: 'https://datasciencepro.com',
            email: 'hello@datasciencepro.com',
            isVerified: true
        },
        {
            companyName: 'DeFi Labs',
            description: 'DeFi protocol development team',
            avatar: '/logo.png',
            website: 'https://defilabs.com',
            email: 'team@defilabs.com',
            isVerified: true
        },
        {
            companyName: 'Growth Marketing Co.',
            description: 'Digital marketing experts and growth consultants',
            avatar: '/logo.png',
            website: 'https://growthmarketing.com',
            email: 'contact@growthmarketing.com',
            isVerified: true
        },
        {
            companyName: 'Code Academy',
            description: 'Free coding education platform',
            avatar: '/logo.png',
            website: 'https://codeacademy.com',
            email: 'support@codeacademy.com',
            isVerified: true
        },
        {
            companyName: 'GitHub Community',
            description: 'Open source community organizers',
            avatar: '/logo.png',
            website: 'https://github.com',
            email: 'community@github.com',
            isVerified: true
        }
    ]

    const createdOrganizers = await Promise.all(
        organizers.map(async (organizerData) => {
            // Create a user for each organizer
            const user = await prisma.user.create({
                data: {
                    walletAddress: `organizer_${organizerData.companyName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`
                }
            })

            // Create organizer
            return prisma.organizer.create({
                data: {
                    userId: user.id,
                    ...organizerData
                }
            })
        })
    )

    const organizerMap = createdOrganizers.reduce((acc, organizer) => {
        acc[organizer.companyName] = organizer.id
        return acc
    }, {} as Record<string, string>)

    // Create events
    const events = [
        {
            title: "Arcium's <encrypted> Side Track",
            price: 20000,
            date: new Date('2024-03-15'),
            time: '19:00',
            ticketsAvailable: 150,
            imageUrl: '/logo.png',
            description: 'Join us for an exclusive deep dive into Arcium\'s innovative encrypted side track technology. This event will cover the latest developments in privacy-preserving blockchain solutions and their practical applications in DeFi.',
            fullAddress: 'Tech Conference Center, 123 Innovation Street, San Francisco, CA 94105',
            schedule: [
                '19:00 - Welcome & Introduction',
                '19:15 - Technical Deep Dive',
                '20:30 - Q&A Session',
                '21:00 - Networking'
            ],
            categoryId: categoryMap['blockchain'],
            organizerId: organizerMap['Arcium']
        },
        {
            title: 'Blockchain Security Workshop',
            price: 8000,
            date: new Date('2024-03-15'),
            time: '21:30',
            ticketsAvailable: 75,
            imageUrl: '/logo.png',
            description: 'Comprehensive workshop covering the latest blockchain security best practices, smart contract auditing, and vulnerability assessment techniques.',
            fullAddress: 'Crypto Hub, 456 Blockchain Avenue, New York, NY 10001',
            schedule: [],
            categoryId: categoryMap['blockchain'],
            organizerId: organizerMap['Crypto Ventures']
        },
        {
            title: 'AI & Machine Learning Summit',
            price: 12000,
            date: new Date('2024-03-16'),
            time: '14:00',
            ticketsAvailable: 30,
            imageUrl: '/logo.png',
            description: 'Explore the latest trends in artificial intelligence and machine learning. Learn from industry experts about cutting-edge algorithms and real-world applications.',
            fullAddress: 'AI Innovation Center, 789 ML Boulevard, Silicon Valley, CA 94043',
            schedule: [],
            categoryId: categoryMap['ai/ml'],
            organizerId: organizerMap['DataScience Pro']
        },
        {
            title: 'Web3 Developer Conference',
            price: 5000,
            date: new Date('2024-03-16'),
            time: '16:30',
            ticketsAvailable: 200,
            imageUrl: '/logo.png',
            description: 'Connect with fellow Web3 developers and learn about the latest decentralized technologies, DeFi protocols, and blockchain development tools.',
            fullAddress: 'Web3 Hub, 321 Decentralized Street, Austin, TX 78701',
            schedule: [],
            categoryId: categoryMap['web3'],
            organizerId: organizerMap['DeFi Labs']
        },
        {
            title: 'Digital Marketing Masterclass',
            price: 35000,
            date: new Date('2024-03-17'),
            time: '10:00',
            ticketsAvailable: 50,
            imageUrl: '/logo.png',
            description: 'Master the art of digital marketing with proven strategies for growth, conversion optimization, and customer acquisition.',
            fullAddress: 'Marketing Institute, 654 Growth Avenue, Chicago, IL 60601',
            schedule: [],
            categoryId: categoryMap['marketing'],
            organizerId: organizerMap['Growth Marketing Co.']
        },
        {
            title: 'Free Web Development Workshop',
            price: 0,
            date: new Date('2024-03-15'),
            time: '18:00',
            ticketsAvailable: 100,
            imageUrl: '/logo.png',
            description: 'Learn web development fundamentals in this hands-on workshop. Perfect for beginners looking to start their coding journey.',
            fullAddress: 'Code Academy Campus, 987 Learning Lane, Seattle, WA 98101',
            schedule: [],
            categoryId: categoryMap['development'],
            organizerId: organizerMap['Code Academy']
        },
        {
            title: 'Open Source Community Meetup',
            price: 0,
            date: new Date('2024-03-16'),
            time: '19:30',
            ticketsAvailable: 200,
            imageUrl: '/logo.png',
            description: 'Join the open source community for networking, project showcases, and discussions about the future of collaborative development.',
            fullAddress: 'Community Center, 147 Open Source Drive, Boston, MA 02101',
            schedule: [],
            categoryId: categoryMap['community'],
            organizerId: organizerMap['GitHub Community']
        }
    ]

    const createdEvents = await Promise.all(
        events.map(event => prisma.event.create({ data: event }))
    )

    // Create users with profiles
    const users = [
        {
            walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
            profile: {
                nickname: 'CryptoEnthusiast',
                avatar: '/avatars/avatar1.png',
                bio: 'Blockchain developer and DeFi enthusiast'
            }
        },
        {
            walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
            profile: {
                nickname: 'AIResearcher',
                avatar: '/avatars/avatar2.png',
                bio: 'Machine learning researcher focused on NLP and computer vision'
            }
        },
        {
            walletAddress: '0x7890abcdef1234567890abcdef1234567890abcd',
            profile: {
                nickname: 'Web3Builder',
                avatar: '/avatars/avatar3.png',
                bio: 'Building decentralized applications on Ethereum and Solana'
            }
        },
        {
            walletAddress: '0x34567890abcdef1234567890abcdef1234567890',
            profile: {
                nickname: 'MarketingGuru',
                avatar: '/avatars/avatar4.png',
                bio: 'Digital marketing specialist with expertise in growth hacking'
            }
        },
        {
            walletAddress: '0xcdef1234567890abcdef1234567890abcdef123456',
            profile: {
                nickname: 'DevMaster',
                avatar: '/avatars/avatar5.png',
                bio: 'Full-stack developer passionate about open source'
            }
        }
    ]

    const createdUsers = await Promise.all(
        users.map(user =>
            prisma.user.create({
                data: {
                    walletAddress: user.walletAddress,
                    profile: {
                        create: user.profile
                    }
                },
                include: {
                    profile: true
                }
            })
        )
    )

    // Create orders and tickets
    const orders = [
        {
            userId: createdUsers[0].id,
            eventId: createdEvents[0].id,
            quantity: 2,
            totalPrice: 40000,
            status: 'confirmed',
            transactionHash: '0xabc123def4567890123456789012345678901234567890123456789012345678',
            nftMintAddress: '0x1234567890abcdef1234567890abcdef12345678'
        },
        {
            userId: createdUsers[1].id,
            eventId: createdEvents[2].id,
            quantity: 1,
            totalPrice: 12000,
            status: 'confirmed',
            transactionHash: '0xdef456abc7890123456789012345678901234567890123456789012345678',
            nftMintAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
        },
        {
            userId: createdUsers[2].id,
            eventId: createdEvents[3].id,
            quantity: 3,
            totalPrice: 15000,
            status: 'confirmed',
            transactionHash: '0x789abc123456def012345678901234567890123456789012345678901234',
            nftMintAddress: '0x7890abcdef1234567890abcdef1234567890abcd'
        },
        {
            userId: createdUsers[3].id,
            eventId: createdEvents[4].id,
            quantity: 1,
            totalPrice: 35000,
            status: 'pending',
            transactionHash: null,
            nftMintAddress: null
        },
        {
            userId: createdUsers[4].id,
            eventId: createdEvents[5].id,
            quantity: 1,
            totalPrice: 0,
            status: 'confirmed',
            transactionHash: '0x456def789abc012345678901234567890123456789012345678901234567',
            nftMintAddress: '0x34567890abcdef1234567890abcdef1234567890'
        },
        {
            userId: createdUsers[0].id,
            eventId: createdEvents[1].id,
            quantity: 2,
            totalPrice: 16000,
            status: 'confirmed',
            transactionHash: '0x567890abcdef1234567890abcdef12345678901234567890123456789012',
            nftMintAddress: '0xcdef1234567890abcdef1234567890abcdef123456'
        },
        {
            userId: createdUsers[2].id,
            eventId: createdEvents[6].id,
            quantity: 1,
            totalPrice: 0,
            status: 'confirmed',
            transactionHash: '0x678901234567890abcdef1234567890abcdef12345678901234567890123',
            nftMintAddress: '0x567890abcdef1234567890abcdef1234567890123'
        }
    ]

    const createdOrders = await Promise.all(
        orders.map(order => prisma.order.create({ data: order }))
    )

    // Create tickets for confirmed orders
    const tickets: {
        eventId: string;
        orderId: string;
        userId: string;
        nftMintAddress: string;
        tokenId: number;
        metadataUri: string;
        isValid: boolean;
        isUsed: boolean;
    }[] = []
    let tokenIdCounter = 1

    createdOrders.forEach((order, orderIndex) => {
        if (order.status === 'confirmed' && order.nftMintAddress) {
            for (let i = 0; i < order.quantity; i++) {
                tickets.push({
                    eventId: order.eventId,
                    orderId: order.id,
                    userId: order.userId,
                    nftMintAddress: `${order.nftMintAddress}${i}`,
                    tokenId: tokenIdCounter++,
                    metadataUri: `https://metadata.example.com/ticket/${order.eventId}/${tokenIdCounter}`,
                    isValid: true,
                    isUsed: orderIndex === 2 ? i === 0 : false // Mark one ticket as used for demonstration
                })
            }
        }
    })

    await Promise.all(
        tickets.map(ticket => prisma.ticket.create({ data: ticket }))
    )

    // Update ticketsSold count for events
    await Promise.all(
        createdEvents.map(async (event) => {
            const soldCount = await prisma.ticket.count({
                where: {
                    eventId: event.id,
                    isValid: true
                }
            })

            return prisma.event.update({
                where: { id: event.id },
                data: { ticketsSold: soldCount }
            })
        })
    )

    console.log('Database seeded successfully!')
    console.log(`Created ${categories.length} categories`)
    console.log(`Created ${createdEvents.length} events`)
    console.log(`Created ${createdUsers.length} users with profiles`)
    console.log(`Created ${createdOrders.length} orders`)
    console.log(`Created ${tickets.length} tickets`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
