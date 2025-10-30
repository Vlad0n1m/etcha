"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Calendar, MapPin, Clock, DollarSign, Users, Upload, X } from 'lucide-react'
import MobileHeader from '@/components/MobileHeader'
import BottomNav from '@/components/BottomNav'
import EventCreationProgress from '@/components/EventCreationProgress'

interface ProgressStep {
    id: string
    label: string
    status: 'pending' | 'in-progress' | 'completed' | 'error'
    message?: string
    progress?: number
}

export default function CreateEventPage() {
    const router = useRouter()
    const { connected, publicKey, signMessage } = useWallet()

    const [formData, setFormData] = useState({
        title: '',
        company: '',
        price: 0 as number,
        date: '',
        time: '',
        ticketsAvailable: 1,
        imageUrl: '',
        description: '',
        fullAddress: '',
        organizerName: '',
        organizerAvatar: '',
        organizerDescription: '',
        schedule: [''],
        categoryId: ''
    })
    const [priceInput, setPriceInput] = useState<string>('')
    const [ticketsInput, setTicketsInput] = useState<string>('')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [imagePreview, setImagePreview] = useState<string>('')
    const [isUploadingImage, setIsUploadingImage] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState<string>('')
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
    const [showProgress, setShowProgress] = useState(false)
    const [currentMessage, setCurrentMessage] = useState('')
    const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([
        { id: 'init', label: 'Initializing Services', status: 'pending' },
        { id: 'collection-nft', label: 'Creating Collection NFT', status: 'pending' },
        { id: 'database', label: 'Saving to Database', status: 'pending' },
        { id: 'complete', label: 'Finalizing', status: 'pending' },
    ])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target

        if (name === 'price') {
            // Filter: allow only digits and one dot/comma
            const filtered = value
                .replace(/[^\d.,]/g, '') // Remove all except digits, dots, commas
                .replace(/,/g, '.') // Replace comma with dot
                .replace(/\./g, (match, offset, string) => {
                    // Keep only first dot
                    return string.indexOf('.') === offset ? '.' : ''
                })

            setPriceInput(filtered)
            setFormData(prev => ({
                ...prev,
                [name]: filtered === '' ? 0 : parseFloat(filtered) || 0
            }))
            return
        }

        if (name === 'ticketsAvailable') {
            // Filter: allow only digits
            const filtered = value.replace(/[^\d]/g, '')

            setTicketsInput(filtered)
            setFormData(prev => ({
                ...prev,
                [name]: filtered === '' ? 0 : parseInt(filtered) || 0
            }))
            return
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleScheduleChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.map((item, i) => i === index ? value : item)
        }))
    }

    const addScheduleItem = () => {
        setFormData(prev => ({
            ...prev,
            schedule: [...prev.schedule, '']
        }))
    }

    const removeScheduleItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            schedule: prev.schedule.filter((_, i) => i !== index)
        }))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image size must be less than 10MB')
            return
        }

        setIsUploadingImage(true)
        setError('')

        try {
            // Create FormData
            const formData = new FormData()
            formData.append('image', file)

            // Upload image
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to upload image')
            }

            const { imageUrl } = await response.json()

            // Update form data with uploaded image URL
            setFormData(prev => ({
                ...prev,
                imageUrl
            }))

            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload image')
        } finally {
            setIsUploadingImage(false)
        }
    }

    const removeImage = () => {
        setFormData(prev => ({
            ...prev,
            imageUrl: ''
        }))
        setImagePreview('')
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file')
            return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Image size must be less than 10MB')
            return
        }

        setIsUploadingAvatar(true)
        setError('')

        try {
            // Create FormData
            const formData = new FormData()
            formData.append('image', file)

            // Upload image
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to upload avatar')
            }

            const { imageUrl } = await response.json()

            // Update form data with uploaded image URL
            setFormData(prev => ({
                ...prev,
                organizerAvatar: imageUrl
            }))

            // Create preview
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload avatar')
        } finally {
            setIsUploadingAvatar(false)
        }
    }

    const removeAvatar = () => {
        setFormData(prev => ({
            ...prev,
            organizerAvatar: ''
        }))
        setAvatarPreview('')
    }

    const updateStepStatus = (stepId: string, status: ProgressStep['status'], message?: string, progress?: number) => {
        setProgressSteps(prev => prev.map(step =>
            step.id === stepId
                ? { ...step, status, message, progress }
                : step
        ))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!connected || !publicKey || !signMessage) {
            setError('Please connect your wallet to create an event')
            return
        }

        setIsLoading(true)
        setError('')
        setShowProgress(true)
        setCurrentMessage('Starting event creation...')

        // Reset progress steps
        setProgressSteps([
            { id: 'init', label: 'Initializing Services', status: 'pending' },
            { id: 'collection-nft', label: 'Creating Collection NFT', status: 'pending' },
            { id: 'candy-machine', label: 'Setting Up Candy Machine', status: 'pending' },
            { id: 'items', label: 'Adding Ticket Items', status: 'pending' },
            { id: 'database', label: 'Saving to Database', status: 'pending' },
            { id: 'complete', label: 'Finalizing', status: 'pending' },
        ])

        try {
            // Use cached signature from AuthProvider or request new one
            setCurrentMessage('🔐 Authenticating your wallet...')
            const { getOrRequestSignature, SIGN_MESSAGE_TEXT } = await import('@/lib/utils/signature-cache')
            const storageKey = publicKey ? `etcha:mint:signature:${publicKey.toBase58()}` : null
            
            let signature: Uint8Array
            if (storageKey && signMessage) {
                signature = await getOrRequestSignature(storageKey, signMessage) as Uint8Array
            } else {
                throw new Error('Wallet not connected')
            }

            // Get auth token using the shared signature
            const authResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    signature: Buffer.from(signature).toString('base64'),
                    message: SIGN_MESSAGE_TEXT
                })
            })

            if (!authResponse.ok) {
                throw new Error('Authentication failed')
            }

            const { token } = await authResponse.json()

            // Create event with streaming progress
            setCurrentMessage('🚀 Creating event on blockchain...')
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    walletAddress: publicKey.toString(),
                    date: new Date(formData.date).toISOString()
                })
            })

            if (!response.ok) {
                throw new Error('Failed to create event')
            }

            // Read the stream
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let eventData: { id: string; collectionNftAddress?: string; candyMachineAddress?: string } | null = null

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value)
                    const lines = chunk.split('\n\n')

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = JSON.parse(line.slice(6))

                            if (data.type === 'error') {
                                throw new Error(data.message)
                            }

                            if (data.type === 'result') {
                                eventData = data.data
                                continue
                            }

                            // Regular progress update
                            const { message, step, progress } = data
                            setCurrentMessage(message)

                            if (step) {
                                // Mark previous steps as completed
                                const stepIndex = progressSteps.findIndex(s => s.id === step)
                                if (stepIndex > 0) {
                                    setProgressSteps(prev => prev.map((s, i) =>
                                        i < stepIndex ? { ...s, status: 'completed' as const } : s
                                    ))
                                }

                                // Update current step
                                updateStepStatus(step, 'in-progress', message, progress)

                                // If progress is 100, mark as completed
                                if (progress === 100) {
                                    updateStepStatus(step, 'completed', message, progress)
                                }
                            }
                        }
                    }
                }
            }

            // Mark all steps as completed
            setProgressSteps(prev => prev.map(step => ({ ...step, status: 'completed' as const })))
            setCurrentMessage('✅ Event created successfully! Redirecting...')

            // Wait a bit to show success state
            await new Promise(resolve => setTimeout(resolve, 1500))

            if (eventData?.id) {
                router.push(`/event/${eventData.id}`)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event')
            setShowProgress(false)

            // Mark current step as error
            setProgressSteps(prev => prev.map(step =>
                step.status === 'in-progress' ? { ...step, status: 'error' as const } : step
            ))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <MobileHeader />

            {/* Progress Modal */}
            {showProgress && (
                <EventCreationProgress
                    steps={progressSteps}
                    currentMessage={currentMessage}
                />
            )}

            <div className="container mx-auto px-4 py-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold text-foreground mb-6">Create Event</h1>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="bg-surface rounded-xl p-6 border border-border">
                            <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Event Title
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter event title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Company/Organizer
                                    </label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Enter company or organizer name"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Price (SOL)
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="price"
                                                inputMode="decimal"
                                                value={priceInput}
                                                onChange={handleInputChange}
                                                onBlur={() => {
                                                    // Format on blur if empty
                                                    if (priceInput === '' && formData.price === 0) {
                                                        setPriceInput('')
                                                    } else if (priceInput === '' && formData.price > 0) {
                                                        setPriceInput(formData.price.toString())
                                                    }
                                                }}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="0.1"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Available Tickets
                                        </label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="ticketsAvailable"
                                                inputMode="numeric"
                                                value={ticketsInput}
                                                onChange={handleInputChange}
                                                onBlur={() => {
                                                    // Format on blur if empty
                                                    if (ticketsInput === '' && formData.ticketsAvailable === 0) {
                                                        setTicketsInput('')
                                                    } else if (ticketsInput === '' && formData.ticketsAvailable > 0) {
                                                        setTicketsInput(formData.ticketsAvailable.toString())
                                                    }
                                                }}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="date"
                                                name="date"
                                                value={formData.date}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="time"
                                                name="time"
                                                value={formData.time}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Event Image
                                        </label>

                                        {imagePreview || formData.imageUrl ? (
                                            <div className="relative w-64 h-64 mx-auto">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={imagePreview || formData.imageUrl}
                                                    alt="Event preview"
                                                    className="w-64 h-64 object-cover rounded-full border-4 border-border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeImage}
                                                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-64 h-64 mx-auto border-2 border-dashed border-border rounded-full cursor-pointer hover:border-primary transition-colors">
                                                <div className="flex flex-col items-center justify-center">
                                                    <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                                                    <p className="mb-2 text-sm text-foreground text-center px-4">
                                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        PNG, JPG, GIF up to 10MB
                                                    </p>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={isUploadingImage}
                                                />
                                            </label>
                                        )}

                                        {isUploadingImage && (
                                            <div className="mt-2 text-sm text-muted-foreground text-center">
                                                Uploading and processing image...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface rounded-xl p-6 border border-border">
                                <h2 className="text-lg font-semibold text-foreground mb-4">Event Details</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            rows={4}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Describe your event..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Venue Address
                                        </label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                name="fullAddress"
                                                value={formData.fullAddress}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Enter full address"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Category
                                        </label>
                                        <select
                                            name="categoryId"
                                            value={formData.categoryId}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="">Select a category</option>
                                            <option value="blockchain">Blockchain</option>
                                            <option value="ai/ml">AI/ML</option>
                                            <option value="web3">Web3</option>
                                            <option value="development">Development</option>
                                            <option value="marketing">Marketing</option>
                                            <option value="community">Community</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface rounded-xl p-6 border border-border">
                                <h2 className="text-lg font-semibold text-foreground mb-4">Organizer Information</h2>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Organizer Name
                                        </label>
                                        <input
                                            type="text"
                                            name="organizerName"
                                            value={formData.organizerName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Enter organizer name"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Organizer Avatar
                                        </label>

                                        {avatarPreview || formData.organizerAvatar ? (
                                            <div className="relative w-32 h-32 mx-auto">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={avatarPreview || formData.organizerAvatar}
                                                    alt="Organizer avatar"
                                                    className="w-32 h-32 object-cover rounded-full border-2 border-border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={removeAvatar}
                                                    className="absolute top-0 right-0 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center w-32 h-32 mx-auto border-2 border-dashed border-border rounded-full cursor-pointer hover:border-primary transition-colors">
                                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground text-center px-2">
                                                    Upload Avatar
                                                </p>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleAvatarUpload}
                                                    disabled={isUploadingAvatar}
                                                />
                                            </label>
                                        )}

                                        {isUploadingAvatar && (
                                            <div className="mt-2 text-sm text-muted-foreground text-center">
                                                Uploading avatar...
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Organizer Description
                                        </label>
                                        <textarea
                                            name="organizerDescription"
                                            value={formData.organizerDescription}
                                            onChange={handleInputChange}
                                            required
                                            rows={3}
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Describe the organizer..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface rounded-xl p-6 border border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-foreground">Schedule</h2>
                                    <button
                                        type="button"
                                        onClick={addScheduleItem}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.schedule.map((item, index) => (
                                        <div key={index} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={item}
                                                onChange={(e) => handleScheduleChange(index, e.target.value)}
                                                className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="e.g., 19:00 - Welcome & Introduction"
                                            />
                                            {formData.schedule.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeScheduleItem(index)}
                                                    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !connected}
                            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Event...' : 'Create Event'}
                        </button>
                    </form>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
