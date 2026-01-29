"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode"

export interface QRScanResult {
    ticketId: string
    nftAddress: string
    eventId: string
}

interface QRScannerProps {
    onScan: (result: QRScanResult) => void
    onError?: (error: string) => void
    isScanning: boolean
    className?: string
}

export default function QRScanner({
    onScan,
    onError,
    isScanning,
    className = "",
}: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const lastScanRef = useRef<string | null>(null)
    const scanCooldownRef = useRef<boolean>(false)

    const handleScanSuccess = useCallback(
        (decodedText: string) => {
            // Prevent scanning the SAME QR code twice in a row
            // But allow scanning DIFFERENT QR codes immediately
            if (decodedText === lastScanRef.current && scanCooldownRef.current) {
                return
            }

            try {
                const data = JSON.parse(decodedText)

                // Validate QR data structure
                if (!data.ticketId || !data.eventId) {
                    console.warn("Invalid QR code format:", data)
                    onError?.("Invalid ticket QR code")
                    return
                }

                // Set cooldown to prevent scanning the same code repeatedly
                scanCooldownRef.current = true
                lastScanRef.current = decodedText

                // Vibrate on successful scan (if supported)
                if (navigator.vibrate) {
                    navigator.vibrate(100)
                }

                onScan({
                    ticketId: data.ticketId,
                    nftAddress: data.nftAddress || "",
                    eventId: data.eventId,
                })

                // Reset cooldown after 2 seconds (for the same QR code)
                setTimeout(() => {
                    scanCooldownRef.current = false
                }, 2000)
            } catch {
                console.warn("Failed to parse QR code:", decodedText)
                onError?.("Invalid QR code format")
            }
        },
        [onScan, onError]
    )

    const handleScanError = useCallback((errorMessage: string) => {
        // Filter out common non-error messages
        if (
            errorMessage.includes("No MultiFormat Readers") ||
            errorMessage.includes("NotFoundException")
        ) {
            return // Not a real error, just no QR code in frame
        }
        console.warn("QR scan error:", errorMessage)
    }, [])

    // Initialize scanner
    useEffect(() => {
        if (!isScanning) return

        const initScanner = async () => {
            try {
                // Check for camera permission
                const devices = await Html5Qrcode.getCameras()
                if (devices && devices.length > 0) {
                    setHasPermission(true)
                    setErrorMessage(null)

                    // Create scanner instance
                    const scanner = new Html5Qrcode("qr-scanner-container")
                    scannerRef.current = scanner

                    // Prefer back camera on mobile
                    const cameraId =
                        devices.find((d) => d.label.toLowerCase().includes("back"))?.id ||
                        devices[0].id

                    await scanner.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1,
                        },
                        handleScanSuccess,
                        handleScanError
                    )
                } else {
                    setHasPermission(false)
                    setErrorMessage("No cameras found")
                    onError?.("No cameras found")
                }
            } catch (err) {
                console.error("Camera error:", err)
                setHasPermission(false)
                const message = err instanceof Error ? err.message : "Camera access denied"
                setErrorMessage(message)
                onError?.(message)
            }
        }

        initScanner()

        // Cleanup
        return () => {
            if (scannerRef.current) {
                const scanner = scannerRef.current
                scannerRef.current = null

                const cleanup = async () => {
                    try {
                        if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
                            await scanner.stop()
                        }
                        scanner.clear()
                    } catch (err) {
                        console.error("Error cleaning up scanner:", err)
                    }
                }

                cleanup()
            }
        }
    }, [isScanning, handleScanSuccess, handleScanError, onError])

    // Reset last scan when scanning stops
    useEffect(() => {
        if (!isScanning) {
            lastScanRef.current = null
            scanCooldownRef.current = false
        }
    }, [isScanning])

    if (!isScanning) {
        return null
    }

    if (hasPermission === false) {
        return (
            <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                            className="w-8 h-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Camera Access Required
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        {errorMessage || "Please allow camera access to scan QR codes"}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Scanner container */}
            <div
                id="qr-scanner-container"
                className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden"
            />

            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg" />

                    {/* Scanning line animation */}
                    <div className="absolute left-2 right-2 h-0.5 bg-primary/70 animate-scan" />
                </div>
            </div>

            {/* Loading state */}
            {hasPermission === null && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                    <div className="text-center text-white">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-sm">Initializing camera...</p>
                    </div>
                </div>
            )}

            {/* Custom styles for scan animation */}
            <style jsx>{`
                @keyframes scan {
                    0%, 100% {
                        top: 10%;
                    }
                    50% {
                        top: 85%;
                    }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
