import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CardContent } from '@/components/ui/card'
import EventCardSkeleton from './EventCardSkeleton'
import { motion } from 'framer-motion'

interface EventCardProps {
    id: string
    title: string
    company: string
    price: number
    date: string
    time?: string
    ticketsAvailable: number
    imageUrl: string
    category: string
    organizer?: {
        name: string
        avatar?: string
    } | null
    isLoading?: boolean
    href?: string
    size?: 'md' | 'lg'
    badge?: string
    description?: string
}

const EventCard: React.FC<EventCardProps> = ({
    id,
    title,
    // company,
    price,
    time,
    imageUrl,
    // organizer,
    isLoading = false,
    href,
    size = 'md',
    badge,
    description
}) => {
    // Если загружается, показываем скелетон
    if (isLoading) {
        return <EventCardSkeleton />
    }
    const formatPrice = (price: number): string => {
        if (price === 0) {
            return 'Free'
        }
        if (price >= 1000) {
            return `${(price / 1000).toFixed(1)}k SOL`
        }
        return `${price} SOL`
    }


    const imageSize = size === 'lg' ? 64 : 48
    const titleClass = size === 'lg' ? 'text-lg' : 'text-base'
    const containerPadding = size === 'lg' ? 'p-2' : 'p-1'

    return (
        <Link href={href || `/event/${id}`} className="block cursor-pointer event-card">
            <motion.div
                className={`w-full overflow-hidden ${containerPadding} border border-slate-200 rounded-lg bg-slate-50 relative hover:bg-slate-100 transition-colors cursor-pointer`}
                whileHover={{
                    scale: 1.02,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20
                }}
            >
                <CardContent className="p-1">
                    <div className="flex items-center gap-3">
                        {/* Circular Avatar */}
                        <motion.div
                            className="w-15 h-15 rounded-lg overflow-hidden shrink-0 bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center"
                            whileHover={{ rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                            <Image
                                src={imageUrl}
                                alt={title}
                                width={imageSize}
                                height={imageSize}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </motion.div>

                        {/* Content Section - Horizontal Layout */}
                        <div className="min-w-0 flex flex-col justify-between h-13">
                            {/* Time and Title */}
                            <div className="flex items-center gap-2">
                                <motion.h3
                                    className={`font-semibold leading-none ${titleClass} text-gray-900 truncate`}
                                    whileHover={{ color: "#3b82f6" }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {title}
                                </motion.h3>
                            </div>
                            {/* Description replaces organizer (up to 5 lines) */}
                            {description && (
                                <p className="text-xs text-gray-500 truncate">
                                    {description}
                                </p>
                            )}

                            {/* Horizontal Details Row */}
                            <div className="flex items-center gap-1.5 text-xs">
                                {/* Price */}
                                <div className="flex items-center gap-1">
                                    <Image
                                        src="/logo.png"
                                        alt="logo"
                                        width={16}
                                        height={16}
                                        className="w-4 h-4 rounded-full object-cover"
                                    />
                                    <span className="font-bold text-gray-900">{formatPrice(price)}</span>
                                </div>

                                {/* Status dot */}
                                {time && (
                                    <motion.span
                                        className="text-xs p-1 bg-gray-200 rounded-md absolute bottom-[6px] right-[6px] text-gray-500 font-medium"
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                                    >
                                        {time}
                                    </motion.span>
                                )}
                            </div>
                        </div>
                        {badge && (
                            <span className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                                {badge}
                            </span>
                        )}
                    </div>
                </CardContent>
            </motion.div>
        </Link>
    )
}

export default EventCard
