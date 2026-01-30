"use client";

import Link from "next/link";
import { Loader2, Ticket } from "lucide-react";
import EventCard from "@/components/EventCard";
import type { Ticket as TicketType } from "@/types";

interface TicketsListProps {
  tickets: TicketType[];
  isLoading: boolean;
  activeTab: "bought" | "on_resale" | "used";
}

export function TicketsList({ tickets, isLoading, activeTab }: TicketsListProps) {
  // Filter tickets by tab
  const filteredTickets = tickets.filter((ticket) => {
    if (activeTab === "bought") return ticket.status === "bought" || ticket.status === "nft";
    if (activeTab === "on_resale") return ticket.status === "on_resale";
    if (activeTab === "used") return ticket.status === "passed";
    return true;
  });

  // Group tickets by date
  const groupedTickets = groupTicketsByDate(filteredTickets);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (groupedTickets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
        <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-2">
          {activeTab === "bought" && "У вас пока нет билетов"}
          {activeTab === "on_resale" && "Нет билетов на продаже"}
          {activeTab === "used" && "Нет использованных билетов"}
        </p>
        {activeTab === "bought" && (
          <Link
            href="/"
            className="text-purple-600 text-sm font-medium hover:underline"
          >
            Смотреть события
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTickets.map((group) => (
        <div key={group.date}>
          <div className="flex items-center mb-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full mr-3" />
            <h3 className="text-base font-semibold text-gray-900 capitalize">
              {formatDateHeader(group.date)}
            </h3>
          </div>
          <div className="space-y-3 pl-5 border-l-2 border-gray-100">
            {group.items.map((ticket) => (
              <EventCard
                key={ticket.id}
                id={ticket.id}
                title={ticket.eventTitle}
                company=""
                price={ticket.price}
                date={ticket.date}
                time={ticket.time}
                ticketsAvailable={0}
                imageUrl={ticket.eventImage}
                category=""
                organizer={null}
                href={`/profile/ticket/${ticket.id}`}
                size="lg"
                description={ticket.description}
                badge={getBadgeText(ticket.status)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Utility functions
function groupTicketsByDate(tickets: TicketType[]) {
  const grouped = tickets.reduce((acc: Record<string, TicketType[]>, t) => {
    const dateKey = t.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {});

  return Object.keys(grouped)
    .sort()
    .map((date) => ({
      date,
      items: grouped[date].sort((a, b) => (a.time || "").localeCompare(b.time || "")),
    }));
}

function formatDateHeader(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Сегодня";
  if (date.toDateString() === tomorrow.toDateString()) return "Завтра";

  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getBadgeText(status: TicketType["status"]): string | undefined {
  switch (status) {
    case "on_resale":
      return "на продаже";
    case "bought":
    case "nft":
      return "куплен";
    default:
      return undefined;
  }
}
