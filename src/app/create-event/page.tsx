"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@solana/wallet-adapter-react'
import { Calendar, MapPin, Clock, Image as ImageIcon, DollarSign, Users, FileText } from 'lucide-react'
import MobileHeader from '@/components/MobileHeader'
import BottomNav from '@/components/BottomNav'

export default function CreateEventPage() {
    const router = useRouter()
    const { connected, publicKey, signMessage } = useWallet()

    const [formData, setFormData] = useState({
        title: '',
        company: '',
        price: 0,
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

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' || name === 'ticketsAvailable'
                ? parseInt(value) || 0
                : value
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!connected || !publicKey || !signMessage) {
            setError('Please connect your wallet to create an event')
            return
        }

        setIsLoading(true)
        setError('')

        try {
            // Create auth message and get signature
            const message = `Create event ${formData.title} at ${new Date().toISOString()}`
            const messageBytes = new TextEncoder().encode(message)
            const signature = await signMessage(messageBytes)

            // Get auth token
            const authResponse = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress: publicKey.toString(),
                    signature: Buffer.from(signature).toString('base64'),
                    message
                })
            })

            if (!authResponse.ok) {
                throw new Error('Authentication failed')
            }

            const { token } = await authResponse.json()

            // Create event
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    date: new Date(formData.date).toISOString()
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create event')
            }

            const event = await response.json()
            router.push(`/event/${event.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            <MobileHeader />

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
                                            Price (USDC)
                                        </label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="number"
                                                name="price"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                required
                                                min="0"
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="0"
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
                                                type="number"
                                                name="ticketsAvailable"
                                                value={formData.ticketsAvailable}
                                                onChange={handleInputChange}
                                                required
                                                min="1"
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="1"
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
                                            Event Image URL
                                        </label>
                                        <div className="relative">
                                            <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="url"
                                                name="imageUrl"
                                                value={formData.imageUrl}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="https://example.com/image.jpg"
                                            />
                                        </div>
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
                                            Organizer Avatar URL
                                        </label>
                                        <input
                                            type="url"
                                            name="organizerAvatar"
                                            value={formData.organizerAvatar}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="https://example.com/avatar.jpg"
                                        />
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
