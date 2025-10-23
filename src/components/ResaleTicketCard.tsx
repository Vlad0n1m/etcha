import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CardContent } from '@/components/ui/card'
import { ArrowDownCircle, ArrowUpCircle, Equal } from 'lucide-react'
import EventCardSkeleton from './EventCardSkeleton'
import { motion } from 'framer-motion'

interface ResaleTicketCardProps {
    id: string
    title: string
    company: string
    price: number
    originalPrice: number
    date: string
    time?: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    seats: string
    isLoading?: boolean
}

const ResaleTicketCard: React.FC<ResaleTicketCardProps> = ({
    id,
    title,
    company,
    price,
    originalPrice,
    date,
    time,
    imageUrl,
    category,
    seats,
    isLoading = false
}) => {
    if (isLoading) {
        return <EventCardSkeleton />
    }

    const getPriceBadge = () => {
        const diff = price - originalPrice
        let badgeText, BadgeIcon, badgeColor, bgColor
        if (diff < 0) {
            badgeText = 'Cheaper'
            BadgeIcon = ArrowDownCircle
            badgeColor = 'text-green-600 border-green-600'
            bgColor = 'bg-green-50'
        } else if (diff > 0) {
            badgeText = 'Higher'
            BadgeIcon = ArrowUpCircle
            badgeColor = 'text-red-600 border-red-600'
            bgColor = 'bg-red-50'
        } else {
            badgeText = 'Same'
            BadgeIcon = Equal
            badgeColor = 'text-gray-600 border-gray-600'
            bgColor = 'bg-gray-50'
        }

        return (
            <motion.div
                className={`flex items-center gap-1 px-2 py-1 border rounded-md text-xs font-medium ml-2 ${badgeColor} ${bgColor}`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
            >
                <BadgeIcon className="w-3 h-3" strokeWidth={2} />
                <span>{badgeText}</span>
            </motion.div>
        )
    }

    return (
        <Link href={`/event/${id}`} className="block">
            <motion.div
                className="w-full overflow-hidden border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer h-full flex flex-col"
                whileHover={{
                    y: -2,
                    scale: 1.02
                }}
                whileTap={{ scale: 0.98 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                }}
            >
                {/* Image Top - Responsive height */}
                <div className="relative h-32 sm:h-48 w-full">
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover rounded-t-lg"
                    />
                </div>

                <CardContent className="p-4 sm:p-6 flex-1">
                    {/* Title and Company - Smaller on mobile */}
                    <div className="mb-2 sm:mb-3">
                        <h3 className="font-semibold text-xs sm:text-sm text-gray-900 leading-tight mb-1 line-clamp-2">{title}</h3>
                        <p className="text-xs text-gray-600">by {company}</p>
                    </div>

                    {/* Details - Compact spacing */}
                    <div className="space-y-1 text-xs text-gray-500 mb-3 sm:mb-4">
                        <div className="flex items-center gap-1 flex-wrap">
                            <span>{date}</span>
                            {time && <span>• {time}</span>}
                        </div>
                        <p className="truncate">Category: {category}</p>
                        <p className="truncate">Seats: {seats}</p>
                    </div>

                    {/* Price with Badge */}
                    <div className="mt-auto flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs sm:text-sm mb-2">
                            <span className="text-lg font-bold text-primary flex items-center">
                                ${price}
                                {getPriceBadge()}
                            </span>
                        </div>

                        {/* Buy Button - Compact on mobile */}
                        <button className="w-full bg-primary text-primary-foreground py-1.5 sm:py-2 px-3 sm:px-4 rounded-md hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium">
                            Buy Now
                        </button>
                    </div>
                </CardContent>
            </motion.div>
        </Link>
    )
}

export default ResaleTicketCard
