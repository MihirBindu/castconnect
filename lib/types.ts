export type UserRole = 'talent' | 'producer' | 'casting_director';

export type IndustryType = 'film' | 'ott' | 'ad_film' | 'theatre' | 'music_video' | 'web_series';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected';

export type AvailabilityStatus = 'available' | 'busy' | 'not_available';

export const BODY_TYPE_OPTIONS = [
  'Slim',
  'Athletic',
  'Average',
  'Muscular',
  'Curvy',
  'Plus Size',
  'Broad',
  'Petite',
  'Prefer Not to Say',
  'Other',
] as const;
export type BodyType = (typeof BODY_TYPE_OPTIONS)[number];

export const COMPLEXION_OPTIONS = [
  'Very Fair',
  'Fair',
  'Light',
  'Wheatish',
  'Medium',
  'Olive',
  'Dusky',
  'Brown',
  'Dark',
  'Deep',
  'Prefer Not to Say',
  'Other',
] as const;
export type Complexion = (typeof COMPLEXION_OPTIONS)[number];

export type HeightUnit = 'ft' | 'cm';

// ── Professional Profile (onboarding step 2) ──────────────────────────────────
export const PROFESSIONAL_ROLE_OPTIONS = [
  'Actor',
  'Actress',
  'Model',
  'Director',
  'Assistant Director',
  'Producer',
  'Executive Producer',
  'Casting Director',
  'Casting Assistant',
  'Screenwriter',
  'Scriptwriter',
  'Cinematographer',
  'Director of Photography',
  'Photographer',
  'Videographer',
  'Editor',
  'Video Editor',
  'Sound Designer',
  'Music Composer',
  'Singer',
  'Dancer',
  'Choreographer',
  'Voice-Over Artist',
  'Anchor',
  'Host',
  'Influencer',
  'Content Creator',
  'Makeup Artist',
  'Hair Stylist',
  'Costume Designer',
  'Fashion Stylist',
  'Production Designer',
  'Art Director',
  'Theatre Artist',
  'Stand-Up Comedian',
  'Stunt Artist',
  'Acting Coach',
  'Talent Manager',
  'Talent Agent',
  'Crew Member',
  'Other',
] as const;
export type ProfessionalRole = (typeof PROFESSIONAL_ROLE_OPTIONS)[number];

export const EXPERIENCE_LEVEL_OPTIONS = [
  'Fresher',
  'Less than 1 year',
  '1–2 years',
  '2–5 years',
  '5–10 years',
  'More than 10 years',
  'Prefer Not to Say',
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVEL_OPTIONS)[number];

export const WORK_PREFERENCE_OPTIONS = [
  'Films',
  'Television',
  'Web Series',
  'Theatre',
  'Advertisements',
  'Short Films',
  'Music Videos',
  'Corporate Videos',
  'Voice-Over',
  'Modelling',
  'Digital Content',
  'Reality Shows',
  'Live Events',
  'Other',
] as const;
export type WorkPreference = (typeof WORK_PREFERENCE_OPTIONS)[number];

export const AVAILABILITY_STATUS_OPTIONS = [
  'Available for Work',
  'Open to Opportunities',
  'Currently Working',
  'Not Available',
  'Prefer Not to Say',
] as const;
export type ProfessionalAvailabilityStatus = (typeof AVAILABILITY_STATUS_OPTIONS)[number];

export const LANGUAGE_PROFICIENCY_OPTIONS = ['Basic', 'Conversational', 'Fluent', 'Native'] as const;
export type LanguageProficiency = (typeof LANGUAGE_PROFICIENCY_OPTIONS)[number];

export interface LanguageEntry {
  language: string;
  proficiency: LanguageProficiency;
}

export const COMMON_LANGUAGES = [
  'Hindi', 'English', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
  'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Odia', 'Assamese', 'Konkani',
  'Bhojpuri', 'Rajasthani', 'Spanish', 'French', 'German', 'Arabic',
] as const;

export const SKILL_SUGGESTIONS = [
  'Acting', 'Method Acting', 'Improvisation', 'Dancing', 'Singing', 'Direction',
  'Screenwriting', 'Photography', 'Video Editing', 'Voice Acting', 'Martial Arts',
  'Modelling', 'Anchoring',
] as const;

export type OnboardingStatus =
  | 'PERSONAL_PROFILE_PENDING'
  | 'PROFESSIONAL_PROFILE_PENDING'
  | 'PORTFOLIO_PENDING'
  | 'PORTFOLIO_PROCESSING'
  | 'COMPLETED';

// ── Portfolio (onboarding step 3) ─────────────────────────────────────────────
export type MediaStatus =
  | 'SELECTED'
  | 'UPLOADING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type ReelSourceType = 'UPLOAD' | 'EXTERNAL_LINK';

export interface ProfilePhoto {
  mediaId: string;
  path: string; // storage object path
  url: string; // public URL
  status: MediaStatus;
}

export interface PortfolioPhoto {
  mediaId: string;
  path: string;
  url: string;
  caption: string;
  displayOrder: number;
  status: MediaStatus;
}

export interface AuditionReel {
  id: string;
  title: string;
  description: string;
  role: string;
  language: string;
  sourceType: ReelSourceType;
  externalUrl?: string | null;
  mediaId?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status: MediaStatus;
}

export interface Showreel {
  id: string;
  title: string;
  category: string;
  customCategory?: string;
  description: string;
  year?: number | null;
  sourceType: ReelSourceType;
  externalUrl?: string | null;
  mediaId?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status: MediaStatus;
}

export interface NotableWork {
  id: string;
  projectTitle: string;
  projectType: string;
  role: string;
  productionCompany: string;
  releaseYear?: number | null;
  projectUrl?: string | null;
  description: string;
}

export interface Award {
  id: string;
  title: string;
  issuingOrganisation: string;
  category: string;
  customCategory?: string;
  year?: number | null;
  description: string;
  documentMediaId?: string | null;
  documentPath?: string | null; // private bucket object path
  verificationUrl?: string | null;
}

export const SHOWREEL_CATEGORY_OPTIONS = [
  'Acting Showreel',
  'Direction Showreel',
  'Modelling Showreel',
  'Dance Showreel',
  'Voice-Over Showreel',
  'Cinematography Showreel',
  'Editing Showreel',
  'Music Showreel',
  'General Showreel',
  'Other',
] as const;

export const NOTABLE_WORK_TYPE_OPTIONS = [
  'Film',
  'Television',
  'Web Series',
  'Theatre',
  'Advertisement',
  'Short Film',
  'Music Video',
  'Documentary',
  'Corporate Video',
  'Digital Content',
  'Modelling Campaign',
  'Voice-Over',
  'Other',
] as const;

export const AWARD_CATEGORY_OPTIONS = [
  'Award',
  'Nomination',
  'Official Selection',
  'Certification',
  'Fellowship',
  'Competition Winner',
  'Industry Recognition',
  'Other',
] as const;

// Host suffixes accepted for external video links.
export const TRUSTED_VIDEO_PLATFORMS = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'drive.google.com',
  'dropbox.com',
] as const;

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

  // ── Onboarding / "Complete Your Profile" fields (optional so existing
  //    mock/sample data stays valid; populated from the backend) ──
  age?: number | null;
  heightCm?: number | null;
  bodyType?: BodyType | null;
  customBodyType?: string;
  complexion?: Complexion | null;
  customComplexion?: string;
  authProvider?: string;
  profileCompleted?: boolean;
  updatedAt?: string;

  // ── Professional Profile onboarding fields ──
  roles?: string[];
  customRoles?: string[];
  primaryRole?: string | null;
  experienceLevel?: ExperienceLevel | null;
  yearStarted?: number | null;
  languages?: LanguageEntry[];
  workPreferences?: string[];
  availabilityStatus?: ProfessionalAvailabilityStatus | null;
  professionalProfileCompleted?: boolean;
  onboardingStatus?: OnboardingStatus;

  // ── Portfolio onboarding fields ──
  profilePhoto?: ProfilePhoto | null;
  portfolioPhotos?: PortfolioPhoto[];
  auditionReels?: AuditionReel[];
  showreels?: Showreel[];
  notableWork?: NotableWork[];
  awards?: Award[];
  portfolioCompleted?: boolean;
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
  status?: 'sending' | 'sent' | 'failed';
}

export type NotificationType = 'message' | 'application_status' | 'follow';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  actorId: string | null;
  entityId: string | null;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
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
