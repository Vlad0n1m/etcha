"use client";

import { cn } from "@/lib/utils";

type TabKey = "posts" | "tickets";

interface ProfileTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  isOwnProfile: boolean;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  isOwnProfile,
}: ProfileTabsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl mb-4">
      <TabButton
        active={activeTab === "posts"}
        onClick={() => onTabChange("posts")}
      >
        Посты
      </TabButton>
      <TabButton
        active={activeTab === "tickets"}
        onClick={() => onTabChange("tickets")}
      >
        {isOwnProfile ? "Билеты" : "Иду"}
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all",
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      )}
    >
      {children}
    </button>
  );
}

// Tickets sub-tabs
type TicketTabKey = "bought" | "on_resale" | "used";

interface TicketTabsProps {
  activeTab: TicketTabKey;
  onTabChange: (tab: TicketTabKey) => void;
}

export function TicketTabs({ activeTab, onTabChange }: TicketTabsProps) {
  const tabs: { key: TicketTabKey; label: string }[] = [
    { key: "bought", label: "Куплено" },
    { key: "on_resale", label: "На продаже" },
    { key: "used", label: "Использовано" },
  ];

  return (
    <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
      {tabs.map((tab) => (
        <TabButton
          key={tab.key}
          active={activeTab === tab.key}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </TabButton>
      ))}
    </div>
  );
}
