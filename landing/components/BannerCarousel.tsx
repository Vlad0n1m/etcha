
"use client"

import React from "react"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import WalletDrawer from "./WalletDrawer"
import { ArrowRight } from "lucide-react"

interface BannerData {
    id: string
    title: string
    description: string
    buttonText: string
    backgroundImage: string
    buttonLink?: string
}

interface BannerCarouselProps {
    banners: BannerData[]
    className?: string
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ banners, className = "" }) => {
    return (
        <div className={`w-full ${className} px-4`}>
             <div className="container mx-auto max-w-5xl">
                <Carousel
                    opts={{
                        align: "start",
                        loop: true,
                    }}
                    className="w-full"
                >
                    <CarouselContent className="-ml-4">
                        {banners.map((banner) => (
                            <CarouselItem key={banner.id} className="pl-4 md:basis-full lg:basis-full">
                                <div className="relative w-full h-[320px] sm:h-[380px] overflow-hidden rounded-[2rem] border border-white/10 group">
                                    {/* Background Image with Zoom Effect */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-105"
                                        style={{
                                            backgroundImage: `url(${banner.backgroundImage})`,
                                        }}
                                    />

                                    {/* Gradient Overlays */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-10 max-w-2xl">
                                        <div className="space-y-4 mb-2">
                                            <h2 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight">
                                                {banner.title}
                                            </h2>
                                            <p className="text-sm md:text-lg text-gray-300 max-w-md font-light leading-relaxed">
                                                {banner.description}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-6">
                                            {banner.buttonLink ? (
                                                <Button
                                                    asChild
                                                    className="bg-white text-black hover:bg-[#14F195] hover:text-black hover:border-transparent px-8 py-6 text-sm font-bold rounded-full transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(20,241,149,0.5)]"
                                                >
                                                    <a href={banner.buttonLink} className="flex items-center gap-2">
                                                        {banner.buttonText} <ArrowRight size={16} />
                                                    </a>
                                                </Button>
                                            ) : (
                                                <WalletDrawer>
                                                    <Button
                                                        className="bg-white text-black hover:bg-[#14F195] hover:text-black px-8 py-6 text-sm font-bold rounded-full transition-all duration-300"
                                                    >
                                                        {banner.buttonText}
                                                    </Button>
                                                </WalletDrawer>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </div>
        </div>
    )
}

export default BannerCarousel
