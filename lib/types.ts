export type UserRole = 'talent' | 'producer' | 'casting_director';

export type IndustryType = 'film' | 'ott' | 'ad_film' | 'theatre' | 'music_video' | 'web_series';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';

export type AvailabilityStatus = 'available' | 'busy' | 'not_available';

export type CrewRole =
  | 'Director'
  | 'Actor'
  | 'Cinematographer'
  | 'Editor'
  | 'Writer'
  | 'Sound Designer'
  | 'Lightman'
  | 'Producer'
  | 'Casting Director'
  | 'Production Designer'
  | 'Makeup Artist'
  | 'Costume Designer'
  | 'VFX Artist'
  | 'Choreographer'
  | 'Stunt Coordinator';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  crewRole: CrewRole;
  bio: string;
  skills: string[];
  experience: string;
  experienceYears: number;
  location: string;
  availability: AvailabilityStatus;
  portfolioLinks: string[];
  profileImage: string | null;
  contactEmail: string;
  contactPhone: string;
  isVerified: boolean;
  industryTypes: IndustryType[];
  connections: string[];
  dayRate: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface CastingCall {
  id: string;
  title: string;
  description: string;
  roleNeeded: string;
  projectType: IndustryType;
  projectName: string;
  location: string;
  compensation: string;
  deadline: string;
  postedBy: string;
  postedByName: string;
  postedByVerified: boolean;
  skillsRequired: string[];
  experienceLevel: string;
  status: 'open' | 'closed';
  applicantCount: number;
  createdAt: string;
}

export interface Application {
  id: string;
  castingCallId: string;
  castingCallTitle: string;
  applicantId: string;
  applicantName: string;
  status: ApplicationStatus;
  appliedAt: string;
  note: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: UserRole;
  participantImage: string | null;
  participantVerified: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface CrewBasketItem {
  profileId: string;
  assignedRole: CrewRole;
  addedAt: string;
}

export interface CrewBasket {
  id: string;
  projectName: string;
  items: CrewBasketItem[];
  createdAt: string;
}
