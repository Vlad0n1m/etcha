// ============================================
// ETCHA - Application Constants
// ============================================

// API Endpoints
export const API_ENDPOINTS = {
  // Events
  EVENTS: "/api/events",
  EVENT_CREATE: "/api/events/create",
  EVENT_DETAIL: (id: string) => `/api/events/${id}`,
  EVENT_UPGRADE: (id: string) => `/api/events/${id}/upgrade-cnft`,

  // Feed
  FEED: "/api/feed",
  FEED_POST: (id: string) => `/api/feed/posts/${id}`,
  FEED_POST_LIKE: (id: string) => `/api/feed/posts/${id}/like`,
  FEED_POST_COMMENTS: (id: string) => `/api/feed/posts/${id}/comments`,

  // Users
  USERS: "/api/users",
  USER_DETAIL: (id: string) => `/api/users/${id}`,
  USER_FOLLOW: (id: string) => `/api/users/${id}/follow`,
  USER_POSTS: (id: string) => `/api/users/${id}/posts`,
  USER_ATTENDING: (id: string) => `/api/users/${id}/attending`,

  // Profile
  PROFILE: "/api/profile",
  PROFILE_TICKETS: "/api/profile/tickets",

  // Notifications
  NOTIFICATIONS: "/api/notifications",
  NOTIFICATIONS_COUNT: "/api/notifications/count",
  NOTIFICATIONS_STREAM: "/api/notifications/stream",

  // Mint
  MINT: "/api/mint",
  MINT_CONFIRM: "/api/mint/confirm",

  // Upload
  UPLOAD_IMAGE: "/api/upload/image",

  // Categories
  CATEGORIES: "/api/categories",
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  FEED_LIMIT: 20,
  COMMENTS_LIMIT: 10,
  NOTIFICATIONS_LIMIT: 20,
} as const;

// Timeouts
export const TIMEOUTS = {
  API_TIMEOUT: 30000,
  TOAST_DURATION: 5000,
  DEBOUNCE_SEARCH: 300,
  POLLING_INTERVAL: 10000,
  SSE_RECONNECT: 3000,
} as const;

// Wallet
export const WALLET = {
  NETWORK: process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet",
  RPC_ENDPOINT: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
} as const;

// Validation
export const VALIDATION = {
  MAX_EVENT_TITLE_LENGTH: 10,
  MAX_POST_CONTENT_LENGTH: 1000,
  MAX_COMMENT_LENGTH: 500,
  MAX_BIO_LENGTH: 160,
  MAX_IMAGES_PER_POST: 4,
  MIN_TICKET_PRICE: 0.001,
} as const;

// UI
export const UI = {
  SCROLL_TOP_THRESHOLD: 300,
  DESCRIPTION_TRUNCATE_LENGTH: 300,
  ADDRESS_DISPLAY_LENGTH: { START: 4, END: 4 },
} as const;

// Routes
export const ROUTES = {
  HOME: "/",
  FEED: "/feed",
  PROFILE: "/profile",
  PROFILE_USER: (id: string) => `/profile/${id}`,
  EVENT: (id: string) => `/event/${id}`,
  TICKET: (id: string) => `/profile/ticket/${id}`,
  RESALE: "/resale",
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ORGANIZER_EVENTS: "/organizer/events",
  ORGANIZER_CREATE: "/organizer/create-event",
  ADMIN: "/admin",
} as const;

// Colors (for programmatic use)
export const COLORS = {
  primary: "#8b5cf6", // purple-500
  success: "#22c55e", // green-500
  error: "#ef4444", // red-500
  warning: "#f59e0b", // amber-500
  info: "#3b82f6", // blue-500
} as const;

// Notification type config
export const NOTIFICATION_CONFIG = {
  LIKE: {
    icon: "Heart",
    color: "text-red-500",
    getMessage: (name: string) => `${name} liked your post`,
  },
  COMMENT: {
    icon: "MessageCircle",
    color: "text-blue-500",
    getMessage: (name: string) => `${name} commented on your post`,
  },
  FOLLOW: {
    icon: "UserPlus",
    color: "text-purple-500",
    getMessage: (name: string) => `${name} started following you`,
  },
  NEW_POST: {
    icon: "FileText",
    color: "text-green-500",
    getMessage: (name: string) => `${name} posted something new`,
  },
} as const;
