export type UserRole = 'talent' | 'producer' | 'casting_director';

export type IndustryType = 'film' | 'ott' | 'ad_film' | 'theatre' | 'music_video' | 'web_series';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';

export type AvailabilityStatus = 'available' | 'busy' | 'not_available';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  bio: string;
  skills: string[];
  experience: string;
  location: string;
  availability: AvailabilityStatus;
  portfolioLinks: string[];
  profileImage: string | null;
  contactEmail: string;
  contactPhone: string;
  isVerified: boolean;
  industryTypes: IndustryType[];
  connections: string[];
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
