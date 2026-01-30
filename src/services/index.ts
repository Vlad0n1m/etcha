// ============================================
// ETCHA - Services Index
// ============================================

// Base API
export { api, API_ENDPOINTS } from "./api";

// Domain Services
export { eventsService } from "./events";
export { feedService } from "./feed";
export { usersService } from "./users";
export { notificationsService } from "./notifications";

// Utility Functions - Events
export {
  formatEventPrice,
  formatEventDate,
  getRelativeDateLabel,
  groupEventsByDate,
  isTicketTypeSoldOut,
  getMaxTicketsForUser,
  hasReachedTicketLimit,
  supportsCNFT,
} from "./events";

// Utility Functions - Feed
export {
  getPostTypeLabel,
  getPostTypeColorClass,
  getPostShareUrl,
} from "./feed";

// Utility Functions - Users
export {
  formatWalletAddress,
  getUserDisplayName,
  getUserInitials,
  canCreateEvents,
} from "./users";

// Utility Functions - Notifications
export {
  getNotificationMessage,
  getNotificationLink,
  getNotificationIcon,
  getNotificationColorClass,
  getActorInfo,
} from "./notifications";
