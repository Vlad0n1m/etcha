import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CardContent } from '@/components/ui/card'
import { DollarSign } from 'lucide-react'
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
}

const EventCard: React.FC<EventCardProps> = ({
    id,
    title,
    company,
    price,
    time,
    imageUrl,
    organizer,
    isLoading = false
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
            return `${(price / 1000).toFixed(0)}k USDC`
        }
        return `${price} USDC`
    }


    return (
        <Link href={`/event/${id}`} className="block cursor-pointer event-card">
            <motion.div
                className="w-full overflow-hidden p-1 border border-slate-200 rounded-lg bg-slate-50 relative hover:bg-slate-100 transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2">
                        {/* Circular Avatar */}
                        <motion.div
                            className="w-15 h-15 rounded-lg overflow-hidden shrink-0 bg-linear-to-br from-purple-500 to-purple-700 flex items-center justify-center"
                            whileHover={{ rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                            <Image
                                src={imageUrl}
                                alt={title}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover rounded-lg"
                            />
                        </motion.div>

                        {/* Content Section - Horizontal Layout */}
                        <div className="min-w-0 flex flex-col justify-between h-13">
                            {/* Time and Title */}
                            <div className="flex items-center gap-2">
                                <motion.h3
                                    className="font-semibold leading-none text-base text-gray-900 truncate"
                                    whileHover={{ color: "#3b82f6" }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {title}
                                </motion.h3>
                            </div>

                            {/* Organizer with verification badge and category */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <span className="text-xs text-gray-600 mr-1">
                                        {organizer?.name || company}
                                    </span>
                                    <motion.div
                                        className="w-2 h-2 bg-blue-500 rounded-full flex items-center justify-center"
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        <svg className="w-1.5 h-1.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>
                                </div>
                            </div>

                            {/* Horizontal Details Row */}
                            <div className="flex items-center gap-1.5 text-xs">
                                {/* Price */}
                                <motion.div
                                    className="flex items-center gap-1"
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                >
                                    <motion.div
                                        className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                                        animate={{ rotate: [0, 360] }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "linear"
                                        }}
                                    >
                                        <DollarSign className="w-2.5 h-2.5 text-white" />
                                    </motion.div>
                                    <span className="font-bold text-gray-900">{formatPrice(price)}</span>
                                </motion.div>

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
                    </div>
                </CardContent>
            </motion.div>
        </Link>
    )
}

export default EventCard
