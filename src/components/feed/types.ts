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
}
