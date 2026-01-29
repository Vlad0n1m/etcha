"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, CheckCircle } from "lucide-react";
import { PostEvent, PostType } from "./types";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface EventBadgeProps {
  event: PostEvent;
  poapProofTx: string | null;
  postType: PostType;
}

const EventBadge: React.FC<EventBadgeProps> = ({ event, poapProofTx, postType }) => {
  const solscanUrl = poapProofTx
    ? `https://solscan.io/tx/${poapProofTx}?cluster=devnet`
    : null;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-3 border border-purple-100"
    >
      <Link href={`/event/${event.id}`} className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0">
          <Image
            src={event.imageUrl}
            alt={event.title}
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{event.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-500">
              {format(new Date(event.date), "d MMMM yyyy", { locale: ru })}
            </span>
          </div>
        </div>
      </Link>

      {/* POAP Proof for ATTENDANCE posts */}
      {postType === "ATTENDANCE" && poapProofTx && solscanUrl && (
        <motion.a
          href={solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg text-white text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <CheckCircle className="w-4 h-4" />
          <span>On-chain Proof</span>
          <ExternalLink className="w-3.5 h-3.5 ml-auto" />
        </motion.a>
      )}
    </motion.div>
  );
};

export default EventBadge;
