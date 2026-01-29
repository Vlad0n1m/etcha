"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Sparkles, CheckCircle } from "lucide-react";
import { PostType } from "./types";

interface EventInfo {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
}

interface SharePostPromptProps {
  isOpen: boolean;
  onClose: () => void;
  authToken: string;
  event: EventInfo;
  type: "TICKET_PURCHASE" | "ATTENDANCE";
  ticketId?: string;
  attendanceId?: string;
  poapProofTx?: string | null;
  onPostCreated?: () => void;
  useSession?: boolean;
}

const SharePostPrompt: React.FC<SharePostPromptProps> = ({
  isOpen,
  onClose,
  authToken,
  event,
  type,
  ticketId,
  attendanceId,
  poapProofTx,
  onPostCreated,
  useSession = false,
}) => {
  const [content, setContent] = useState(
    type === "TICKET_PURCHASE"
      ? `Приходите со мной на ${event.title}! 🎫`
      : `Был на ${event.title}! 🎉`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/api/feed/posts", {
        method: "POST",
        headers,
        credentials: useSession ? "include" : "same-origin",
        body: JSON.stringify({
          content: content.trim() || undefined,
          type,
          eventId: event.id,
          ticketId: type === "TICKET_PURCHASE" ? ticketId : undefined,
          attendanceId: type === "ATTENDANCE" ? attendanceId : undefined,
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        onPostCreated?.();
        setTimeout(() => {
          onClose();
          setIsSuccess(false);
          setContent(
            type === "TICKET_PURCHASE"
              ? `Приходите со мной на ${event.title}! 🎫`
              : `Был на ${event.title}! 🎉`
          );
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    type === "TICKET_PURCHASE"
      ? "Поделиться в ленте?"
      : "Поделиться посещением?";

  const subtitle =
    type === "TICKET_PURCHASE"
      ? "Расскажите друзьям, что вы идёте на ивент"
      : "Покажите всем свой on-chain proof посещения";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-900">{title}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

              {/* Event Preview */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl mb-4">
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.title}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(event.date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {type === "ATTENDANCE" && poapProofTx && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">POAP</span>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Добавьте что-нибудь..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              {/* Success State */}
              <AnimatePresence>
                {isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Пост опубликован!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Пропустить
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting || isSuccess}
                className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Готово
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Поделиться
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SharePostPrompt;
