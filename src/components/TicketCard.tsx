"use client"

import type React from "react"
import Image from "next/image"
import { Calendar, MapPin, Clock, CheckCircle2 } from "lucide-react"
import { motion } from "framer-motion"

interface TicketCardProps {
  id: string
  eventTitle: string
  eventImage: string
  date: string
  time: string
  location: string
  price: number
  status: "purchased" | "attended"
  nftId: string
}

const TicketCard: React.FC<TicketCardProps> = ({
  eventTitle,
  eventImage,
  date,
  time,
  location,
  price,
  status,
  nftId,
}) => {
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return `${(price / 1000).toFixed(0)}k USDC`
    }
    return `${price} USDC`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <motion.div
      className="w-full overflow-hidden border border-slate-200 rounded-xl bg-white relative"
      whileHover={{
        scale: 1.01,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* Event Image */}
          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-100">
            <Image
              src={eventImage || "/placeholder.svg"}
              alt={eventTitle}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-base text-gray-900 leading-tight">{eventTitle}</h3>
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${
                  status === "attended" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {status === "attended" ? "Attended" : "Purchased"}
              </span>
            </div>

            {/* Event Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(date)}</span>
                <span className="text-gray-400">•</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{time}</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{location}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-900">{formatPrice(price)}</span>
                <span className="text-xs text-gray-500">NFT #{nftId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      {status === "attended" && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </div>
      )}
    </motion.div>
  )
}

export default TicketCard
