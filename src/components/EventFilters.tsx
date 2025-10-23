import React from 'react'

interface EventFiltersProps {
  onFilterChange: (filter: string) => void
  activeFilter: string
}

const EventFilters: React.FC<EventFiltersProps> = ({ onFilterChange, activeFilter }) => {
  // Фильтры для ивентов - только категории
  const filterItems = [
    { label: "All", value: "all" },
    { label: "Blockchain", value: "blockchain" },
    { label: "AI/ML", value: "ai/ml" },
    { label: "Web3", value: "web3" },
    { label: "Development", value: "development" },
    { label: "Marketing", value: "marketing" },
    { label: "Community", value: "community" },
  ]

  const handleFilterClick = (value: string) => {
    onFilterChange(value)
  }

  return (
    <div className="w-full ">
      <div className="h-[60px] flex items-center">
        <div className="overflow-x-auto scrollbar-hide w-full">
          <div className="flex py-1 whitespace-nowrap">
            {filterItems.map((item) => (
              <button
                key={item.value}
                onClick={() => handleFilterClick(item.value)}
                className={`
                  px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 
                  relative group w-auto ml-2 first:ml-4
                  ${activeFilter === item.value
                    ? 'bg-black text-white transform scale-105 border-2 border-black'
                    : 'bg-white text-black border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-1'
                  }
                `}
              >
                <span className="relative z-10">{item.label}</span>
                {activeFilter === item.value && (
                  <div className="absolute inset-0 bg-linear-to-r from-black to-gray-800 rounded-full opacity-90"></div>
                )}
                <div className={`
                  absolute inset-0 rounded-full transition-opacity duration-300
                  ${activeFilter === item.value
                    ? 'opacity-0'
                    : 'opacity-0 group-hover:opacity-5 bg-black'
                  }
                `}></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventFilters
