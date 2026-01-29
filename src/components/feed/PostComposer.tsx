"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, X, Loader2, Calendar, Send } from "lucide-react";
import { PostType } from "./types";

interface EventOption {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
}

interface PostComposerProps {
  authToken: string | null;
  userAvatar?: string | null;
  userName?: string | null;
  onPostCreated?: () => void;
  preselectedEvent?: EventOption | null;
  preselectedType?: PostType;
  ticketId?: string;
  attendanceId?: string;
  placeholder?: string;
  useSession?: boolean; // Use NextAuth session instead of wallet token
}

const PostComposer: React.FC<PostComposerProps> = ({
  authToken,
  userAvatar,
  userName,
  onPostCreated,
  preselectedEvent,
  preselectedType = "REGULAR",
  ticketId,
  attendanceId,
  placeholder = "Что нового?",
  useSession = false,
}) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(preselectedEvent || null);
  const [postType, setPostType] = useState<PostType>(preselectedType);
  const [showEventSearch, setShowEventSearch] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventSearchResults, setEventSearchResults] = useState<EventOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 4) {
      alert("Максимум 4 изображения");
      return;
    }

    setIsUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const headers: Record<string, string> = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch("/api/feed/upload", {
          method: "POST",
          headers,
          body: formData,
          credentials: useSession ? "include" : "same-origin",
        });

        if (response.ok) {
          const data = await response.json();
          newImages.push(data.url);
        }
      } catch (error) {
        console.error("Failed to upload image:", error);
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setIsUploading(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const searchEvents = async (query: string) => {
    if (!query.trim()) {
      setEventSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/events?search=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setEventSearchResults(
          data.events?.map((e: { id: string; title: string; imageUrl: string; date: string }) => ({
            id: e.id,
            title: e.title,
            imageUrl: e.imageUrl,
            date: e.date,
          })) || []
        );
      }
    } catch (error) {
      console.error("Failed to search events:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if ((!content.trim() && images.length === 0) || isSubmitting) return;

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
          images: images.length > 0 ? images : undefined,
          type: postType,
          eventId: selectedEvent?.id,
          ticketId: postType === "TICKET_PURCHASE" ? ticketId : undefined,
          attendanceId: postType === "ATTENDANCE" ? attendanceId : undefined,
        }),
      });

      if (response.ok) {
        setContent("");
        setImages([]);
        setSelectedEvent(preselectedEvent || null);
        setPostType(preselectedType);
        onPostCreated?.();
      }
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = (content.trim() || images.length > 0) && !isSubmitting && !isUploading;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Header with avatar */}
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName || "User"}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-sm">
                {(userName || "U")[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              maxLength={2000}
              className="w-full resize-none border-0 focus:ring-0 text-gray-800 placeholder-gray-400 text-base p-0"
            />
          </div>
        </div>

        {/* Selected Event */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <Image
                  src={selectedEvent.imageUrl}
                  alt={selectedEvent.title}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {selectedEvent.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedEvent.date).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {!preselectedEvent && (
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-1 hover:bg-purple-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Images Preview */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex gap-2 flex-wrap"
            >
              {images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="relative w-20 h-20 rounded-lg overflow-hidden"
                >
                  <Image
                    src={image}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Event Search */}
        <AnimatePresence>
          {showEventSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <div className="relative">
                <input
                  type="text"
                  value={eventSearchQuery}
                  onChange={(e) => {
                    setEventSearchQuery(e.target.value);
                    searchEvents(e.target.value);
                  }}
                  placeholder="Поиск ивента..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>
              {eventSearchResults.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {eventSearchResults.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventSearch(false);
                        setEventSearchQuery("");
                        setEventSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors"
                    >
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-cover"
                      />
                      <span className="text-sm text-gray-900 truncate">{event.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || images.length >= 4}
            className="p-2 text-gray-500 hover:text-purple-500 hover:bg-purple-50 rounded-full transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
          </motion.button>

          {/* Event Select */}
          {!preselectedEvent && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowEventSearch(!showEventSearch)}
              className={`p-2 rounded-full transition-colors ${showEventSearch || selectedEvent
                ? "text-purple-500 bg-purple-50"
                : "text-gray-500 hover:text-purple-500 hover:bg-purple-50"
                }`}
            >
              <Calendar className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 bg-purple-500 text-white rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Опубликовать</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default PostComposer;
