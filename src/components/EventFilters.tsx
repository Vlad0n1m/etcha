import React from 'react'
import { Globe, Code, Brain, Network, Code2, Megaphone, Users } from 'lucide-react'

interface EventFiltersProps {
  onFilterChange: (filter: string) => void
  activeFilter: string
}

// Map string icon names from DB to lucide-react icon components
const iconRegistry: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  code: Code,
  brain: Brain,
  network: Network,
  code2: Code2,
  megaphone: Megaphone,
  users: Users,
}

interface FilterItem {
  label: string
  value: string
  icon?: string
}

const EventFilters: React.FC<EventFiltersProps> = ({ onFilterChange, activeFilter }) => {
  const [filterItems, setFilterItems] = React.useState<FilterItem[]>([
    { label: 'All', value: 'all', icon: 'globe' },
  ])

  React.useEffect(() => {
    let isCancelled = false

    const loadCategories = async () => {
      try {
        const res = await fetch('/api/filters/categories', { cache: 'no-store' })
        if (!res.ok) {
          // Fallback to /api/categories shape if filters endpoint is unavailable
          const alt = await fetch('/api/categories', { cache: 'no-store' })
          if (!alt.ok) return
          const data = await alt.json()
          if (!isCancelled && data?.success && Array.isArray(data.categories)) {
            const items: FilterItem[] = data.categories.map((c: any) => ({
              label: c.name,
              value: c.value,
              icon: (c.icon || '').toString().toLowerCase(),
            }))
            setFilterItems([{ label: 'All', value: 'all', icon: 'globe' }, ...items])
          }
          return
        }

        const categories = await res.json()
        if (!isCancelled && Array.isArray(categories)) {
          const items: FilterItem[] = categories.map((c: any) => ({
            label: c.label,
            value: c.value,
            icon: (c.icon || '').toString().toLowerCase(),
          }))
          setFilterItems([{ label: 'All', value: 'all', icon: 'globe' }, ...items])
        }
      } catch (_) {
        // Silently ignore; keep default "All"
      }
    }

    loadCategories()
    return () => {
      isCancelled = true
    }
  }, [])

  const handleFilterClick = (value: string) => {
    onFilterChange(value)
  }

  return (
    <div className="w-full">
      <div className="h-[60px] flex items-center">
        <div className="overflow-x-auto scrollbar-hide w-full">
          <div className="flex py-1 whitespace-nowrap">
            {filterItems.map((item) => {
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
