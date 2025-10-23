"use client"

import React from "react"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import WalletDrawer from "./WalletDrawer"

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
        <div className={`w-full ${className}`}>
            <Carousel
                opts={{
                    align: "start",
                    loop: true,

                }}
                className="w-full"
            >
                <CarouselContent className="ml-0">
                    {banners.map((banner) => (
                        <CarouselItem key={banner.id} className="px-2">
                            <div className="relative w-full h-[250px] overflow-hidden rounded-lg">
                                {/* Background Image */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                    style={{
                                        backgroundImage: `url(${banner.backgroundImage})`,
                                    }}
                                />

                                {/* Dark Overlay */}
                                <div className="absolute inset-0 bg-black/40" />

                                {/* Content */}
                                <div className="relative z-10 flex flex-col items-start h-full p-4 pt-10 md:p-8">
                                    <div className="max-w-2xl flex flex-col justify-around h-full   ">
                                        <h2 className="text-2xl md:text-3xl leading-4.5 font-bold text-white mb-6">
                                            {banner.title}
                                        </h2>
                                        <p className="text-base leading-4.5 md:text-lg text-white/90 mb-4 md:mb-6 ">
                                            {banner.description}
                                        </p>
                                        {banner.buttonLink ? (
                                            <Button
                                                asChild
                                                className="bg-white text-black hover:bg-white/90 px-6 py-2 text-base font-semibold rounded-lg transition-all duration-200 w-full mt-auto"
                                            >
                                                <a href={banner.buttonLink}>
                                                    {banner.buttonText}
                                                </a>
                                            </Button>
                                        ) : (
                                            <WalletDrawer>
                                                <Button
                                                    className="bg-white text-black hover:bg-white/90 px-6 py-2 text-base font-semibold rounded-lg transition-all duration-200 w-full "
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
    )
}

export default BannerCarousel
