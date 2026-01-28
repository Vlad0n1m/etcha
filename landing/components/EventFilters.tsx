
import React from 'react'
import { Globe, Code, Brain, Network, Code2, Megaphone, Users, Zap, Music, Palette } from 'lucide-react'

interface EventFiltersProps {
  onFilterChange: (filter: string) => void
  activeFilter: string
}

// Map string icon names from DB to lucide-react icon components
const iconRegistry: Record<string, React.ComponentType<{ className?: string, size?: number }>> = {
  globe: Globe,
  code: Code,
  brain: Brain,
  network: Network,
  code2: Code2,
  megaphone: Megaphone,
  users: Users,
  music: Music,
  art: Palette,
  zap: Zap
}

interface FilterItem {
  label: string
  value: string
  icon?: string
}

const EventFilters: React.FC<EventFiltersProps> = ({ onFilterChange, activeFilter }) => {
  // Hardcoded filters for demo purposes since we want immediate visual result
  const [filterItems, setFilterItems] = React.useState<FilterItem[]>([
    { label: 'All Events', value: 'all', icon: 'globe' },
    { label: 'Parties', value: 'party', icon: 'music' },
    { label: 'Art & NFT', value: 'art', icon: 'art' },
    { label: 'Crypto', value: 'crypto', icon: 'zap' },
    { label: 'Networking', value: 'networking', icon: 'users' },
  ])

  const handleFilterClick = (value: string) => {
    onFilterChange(value)
  }

  return (
    <div className="w-full relative">
      {/* Gradient fade masks for scrolling */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none md:hidden"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none md:hidden"></div>

      <div className="overflow-x-auto scrollbar-hide w-full pb-2 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 min-w-max">
          {filterItems.map((item) => {
            const Icon = item.icon && iconRegistry[item.icon] ? iconRegistry[item.icon] : Globe
            const isActive = activeFilter === item.value

            return (
              <button
                key={item.value}
                onClick={() => handleFilterClick(item.value)}
                className={`
                  relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 
                  flex items-center gap-2 border
                  ${isActive
                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                    : 'bg-[#111] text-gray-400 border-white/10 hover:border-white/30 hover:text-white hover:bg-[#1a1a1a]'
                  }
                `}
              >
                <Icon size={14} className={isActive ? 'text-black' : 'text-gray-500 group-hover:text-white'} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default EventFilters
