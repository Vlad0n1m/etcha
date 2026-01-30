// ============================================
// ETCHA - Centralized Types & Interfaces
// ============================================

// ============================================
// User & Auth Types
// ============================================

export interface User {
  id: string;
  name: string | null;
  email?: string | null;
  image?: string | null;
  walletAddress: string | null;
  role?: UserRole;
  organizerStatus?: OrganizerStatus;
}

export type UserRole = "USER" | "ORGANIZER" | "ADMIN";
export type OrganizerStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface UserProfile {
  id: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  walletAddress: string | null;
  createdAt: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  isOrganizer: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ============================================
// Event Types
// ============================================

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  price: number;
  ticketsAvailable: number;
  totalTicketsAvailable?: number;
  ticketsSold?: number;
  imageUrl: string;
  fullAddress: string;
  locationMapUrl?: string | null;
  maxTicketsPerUser?: number | null;
  category?: string;
  company?: string;
  organizer: EventOrganizer;
  ticketTypes?: TicketType[];
  collectionNftAddress?: string;
  merkleTreeAddress?: string;
  merkleTreeDepth?: number;
  nftType?: "cnft" | "legacy";
  isActive?: boolean;
}

export interface EventOrganizer {
  id: string;
  name: string;
  avatar: string;
  description: string;
}

export interface EventListItem {
  id: string;
  title: string;
  price: number;
  date: string;
  time: string;
  ticketsAvailable: number;
  imageUrl: string;
  category: string;
  description?: string;
  organizer?: {
    name: string;
    avatar?: string;
  } | null;
}

export interface EventFilters {
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
}

// ============================================
// Ticket Types
// ============================================

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  available: number;
  description: string | null;
  sortOrder: number;
}

export type TicketStatus = "bought" | "on_resale" | "passed" | "nft";

export interface Ticket {
  id: string;
  nftId: string;
  eventId: string;
  eventTitle: string;
  eventImage: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  price: number;
  originalPrice: number;
  marketPrice: number;
  status: TicketStatus;
  organizerName?: string;
  ticketTypeName?: string;
}

export interface TicketPurchaseResult {
  success: boolean;
  nftMintAddresses: string[];
  transactionSignature: string;
  totalPaid: number;
  message?: string;
  organizerPayment: {
    amount: number;
    transactionHash: string;
  };
  platformFee: {
    amount: number;
  };
  orderId: string;
}

// ============================================
// Feed & Post Types
// ============================================

export type PostType = "REGULAR" | "TICKET_PURCHASE" | "ATTENDANCE";

export interface PostAuthor {
  id: string;
  name: string | null;
  avatar: string | null;
  walletAddress: string | null;
}

export interface PostEvent {
  id: string;
  title: string;
  imageUrl: string;
  date: string;
}

export interface Post {
  id: string;
  content: string | null;
  images: string[];
  type: PostType;
  createdAt: string;
  author: PostAuthor;
  event: PostEvent | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  poapProofTx: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: PostAuthor;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = "LIKE" | "COMMENT" | "FOLLOW" | "NEW_POST";

export interface Notification {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  postId?: string | null;
  commentId?: string | null;
  isRead: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    image: string | null;
    profile?: {
      nickname: string | null;
      avatar: string | null;
    } | null;
  };
}

// ============================================
// Resale Types
// ============================================

export interface ResaleListing {
  id: string;
  ticketId: string;
  sellerId: string;
  price: number;
  originalPrice: number;
  event: EventListItem;
  seller: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  createdAt: string;
  status: "active" | "sold" | "cancelled";
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string | null;
  total?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

// ============================================
// Form Types
// ============================================

export interface CreateEventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  fullAddress: string;
  locationMapUrl?: string;
  categoryId: string;
  imageUrl?: string;
  ticketTypes: CreateTicketTypeInput[];
  maxTicketsPerUser?: number;
  organizerWallet: string;
}

export interface CreateTicketTypeInput {
  name: string;
  price: number;
  quantity: number;
  description?: string;
  sortOrder?: number;
}

export interface CreatePostForm {
  content: string;
  images?: string[];
  eventId?: string;
  type?: PostType;
}

// ============================================
// Wallet Types
// ============================================

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number | null;
  isLoading: boolean;
}

// ============================================
// UI Component Props Types
// ============================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// ============================================
// Date Group Types (for timeline display)
// ============================================

export interface DateGroup<T> {
  date: string;
  items: T[];
}

// ============================================
// Constants
// ============================================

export const POST_TYPE_LABELS: Record<PostType, string> = {
  REGULAR: "",
  TICKET_PURCHASE: "Иду на ивент!",
  ATTENDANCE: "Был на ивенте",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  bought: "Куплен",
  on_resale: "На продаже",
  passed: "Использован",
  nft: "NFT",
};
