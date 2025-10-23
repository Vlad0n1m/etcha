import React from 'react'

const EventCardSkeleton: React.FC = () => {
    return (
        <div className="w-full overflow-hidden p-1 border border-slate-200 rounded-lg bg-slate-50 relative animate-pulse">
            <div className="p-1">
                <div className="flex items-center gap-2">
                    {/* Circular Avatar Skeleton */}
                    <div className="w-15 h-15 rounded-lg bg-gray-300 shrink-0"></div>

                    {/* Content Section Skeleton */}
                    <div className="min-w-0 flex flex-col justify-between h-13 flex-1">
                        {/* Title Skeleton */}
                        <div className="flex items-center gap-2">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        </div>

                        {/* Company Skeleton */}
                        <div className="flex items-center">
                            <div className="h-3 bg-gray-300 rounded w-1/3 mr-1"></div>
                            <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        </div>

                        {/* Price and Details Skeleton */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1">
                                <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                                <div className="h-3 bg-gray-300 rounded w-16"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default EventCardSkeleton
