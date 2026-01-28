
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CardContent } from '@/components/ui/card'
import EventCardSkeleton from './EventCardSkeleton'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Tag } from 'lucide-react'

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
    date,
    time,
    imageUrl,
    category,
    // organizer,
    isLoading = false,
    href,
    size = 'md',
    badge,
    description
}) => {
    // If loading, show skeleton
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

    const imageSize = size === 'lg' ? 120 : 80 // Larger images for better visual

    return (
        <Link href={href || `/event/${id}`} className="block w-full">
            <motion.div
                className="group relative w-full overflow-hidden rounded-2xl bg-[#0F0F0F] border border-white/5 hover:border-[#9945FF]/40 transition-all duration-300"
                whileHover={{
                    y: -4,
                    boxShadow: "0 10px 40px -10px rgba(153, 69, 255, 0.15)"
                }}
                whileTap={{ scale: 0.99 }}
            >
                <div className="flex p-3 sm:p-4 gap-4">
                    {/* Image Section */}
                    <div className="relative shrink-0 overflow-hidden rounded-xl bg-gray-900" style={{ width: imageSize, height: imageSize }}>
                        <Image
                            src={imageUrl}
                            alt={title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                        
                        {/* Date Badge over Image */}
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white px-2 py-1 rounded-md border border-white/10">
                             {new Date(date).getDate()}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col justify-between flex-1 min-w-0 py-1">
                        <div>
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="text-base sm:text-lg font-display font-bold text-white leading-tight truncate pr-2 group-hover:text-[#14F195] transition-colors">
                                    {title}
                                </h3>
                                {/* Price Badge */}
                                <div className={`shrink-0 px-2 py-1 rounded-md text-xs font-bold ${price > 0 ? 'bg-[#9945FF]/10 text-[#9945FF] border border-[#9945FF]/20' : 'bg-[#14F195]/10 text-[#14F195] border border-[#14F195]/20'}`}>
                                    {formatPrice(price)}
                                </div>
                            </div>
                            
                            {description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>

                        {/* Footer Info */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-medium">
                            {time && (
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-gray-600 group-hover:text-white transition-colors" />
                                    <span>{time}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Tag size={12} className="text-gray-600 group-hover:text-white transition-colors" />
                                <span className="uppercase tracking-wider text-[10px]">{category || 'Event'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Optional Status Badge */}
                {badge && (
                    <div className="absolute top-3 right-3 bg-[#14F195] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(20,241,149,0.4)]">
                        {badge}
                    </div>
                )}
            </motion.div>
        </Link>
    )
}

export default EventCard
