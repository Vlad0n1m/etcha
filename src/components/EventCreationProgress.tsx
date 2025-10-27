"use client"

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

interface ProgressStep {
    id: string
    label: string
    status: 'pending' | 'in-progress' | 'completed' | 'error'
    message?: string
    progress?: number
}

interface EventCreationProgressProps {
    steps: ProgressStep[]
    currentMessage: string
}

export default function EventCreationProgress({ steps, currentMessage }: EventCreationProgressProps) {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-5">
                    <h2 className="text-2xl font-bold text-white">Creating Your Event</h2>
                    <p className="text-purple-100 mt-1">Please wait while we set up your event on the blockchain</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {/* Current Message */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                            <p className="text-blue-800 font-medium">{currentMessage}</p>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`relative pl-8 pb-6 ${index === steps.length - 1 ? 'pb-0' : ''
                                    }`}
                            >
                                {/* Timeline line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={`absolute left-[11px] top-6 w-0.5 h-full ${step.status === 'completed'
                                                ? 'bg-green-500'
                                                : 'bg-gray-200'
                                            }`}
                                    />
                                )}

                                {/* Icon */}
                                <div className="absolute left-0 top-0">
                                    {step.status === 'completed' && (
                                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                                    )}
                                    {step.status === 'in-progress' && (
                                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                    )}
                                    {step.status === 'error' && (
                                        <AlertCircle className="w-6 h-6 text-red-500" />
                                    )}
                                    {step.status === 'pending' && (
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                                    )}
                                </div>

                                {/* Content */}
                                <div>
                                    <h3
                                        className={`font-semibold ${step.status === 'completed'
                                                ? 'text-green-700'
                                                : step.status === 'in-progress'
                                                    ? 'text-blue-700'
                                                    : step.status === 'error'
                                                        ? 'text-red-700'
                                                        : 'text-gray-400'
                                            }`}
                                    >
                                        {step.label}
                                    </h3>

                                    {step.message && (
                                        <p className="text-sm text-gray-600 mt-1">{step.message}</p>
                                    )}

                                    {step.status === 'in-progress' && step.progress !== undefined && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                <span>Progress</span>
                                                <span>{step.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-300 ease-out"
                                                    style={{ width: `${step.progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <p className="text-sm text-gray-600 text-center">
                        ⏱️ This process may take a few moments. Please don&apos;t close this window.
                    </p>
                </div>
            </div>
        </div>
    )
}

