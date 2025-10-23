import React from 'react'

interface ResaleCategoryFilterProps {
    onFilterChange: (filter: string) => void
    activeFilter: string
}

const ResaleCategoryFilter: React.FC<ResaleCategoryFilterProps> = ({ onFilterChange, activeFilter }) => {
    const filterItems = [
        { label: "Category", value: "all" },
        { label: "Blockchain", value: "blockchain" },
        { label: "AI/ML", value: "ai/ml" },
        { label: "Web3", value: "web3" },
        { label: "Development", value: "development" },
        { label: "Marketing", value: "marketing" },
        { label: "Community", value: "community" },
    ]

    return (
        <div className="flex-1 min-w-[200px]">
            <select
                value={activeFilter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            >
                {filterItems.map((item) => (
                    <option key={item.value} value={item.value}>
                        {item.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default ResaleCategoryFilter
