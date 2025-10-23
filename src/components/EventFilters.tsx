import React from 'react'
import { Globe, Code, Brain, Network, Code2, Megaphone, Users } from 'lucide-react'

interface EventFiltersProps {
  onFilterChange: (filter: string) => void
  activeFilter: string
}

const EventFilters: React.FC<EventFiltersProps> = ({ onFilterChange, activeFilter }) => {
  // Фильтры для ивентов - только категории
  const filterItems = [
    { label: "All", value: "all", icon: Globe },
    { label: "Blockchain", value: "blockchain", icon: Code },
    { label: "AI/ML", value: "ai/ml", icon: Brain },
    { label: "Web3", value: "web3", icon: Network },
    { label: "Development", value: "development", icon: Code2 },
    { label: "Marketing", value: "marketing", icon: Megaphone },
    { label: "Community", value: "community", icon: Users },
  ]

  const handleFilterClick = (value: string) => {
    onFilterChange(value)
  }

  return (
    <div className="w-full">
      <div className="h-[60px] flex items-center">
        <div className="overflow-x-auto scrollbar-hide w-full">
          <div className="flex py-1 whitespace-nowrap">
            {filterItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.value}
                  onClick={() => handleFilterClick(item.value)}
                  className={`
                    px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 
                    flex items-center gap-1.5
                    relative group w-auto ml-2 first:ml-4
                    ${activeFilter === item.value
                      ? 'bg-black text-white transform scale-105 border-2 border-black'
                      : 'bg-white text-black border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-1'
                    }
                  `}
                >
                  <Icon className={`w-3 h-3 flex-shrink-0 ${activeFilter === item.value ? 'text-white' : 'text-black'}`} />
                  <span className="relative z-10">{item.label}</span>
                  {/* Remove the problematic gradient overlay */}
                  <div className={`
                    absolute inset-0 rounded-full transition-opacity duration-300
                    ${activeFilter === item.value
                      ? 'opacity-0'
                      : 'opacity-0 group-hover:opacity-5 bg-black'
                    }
                  `}></div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventFilters
