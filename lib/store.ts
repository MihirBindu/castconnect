import { createContext, useContext } from 'react';
import { Session } from '@supabase/supabase-js';
import { UserProfile, CastingCall, Conversation, Message, Application, CrewBasketItem, CrewRole } from './types';

export type ApplyOutcome =
  | { ok: true; alreadyApplied: boolean }
  | { ok: false; message: string };

export interface AppState {
  session: Session | null;
  myProfile: UserProfile;
  profiles: UserProfile[];
  castingCalls: CastingCall[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  applications: Application[];
  crewBasket: CrewBasketItem[];
  crewProjectName: string;
  isLoading: boolean;
  isOffline: boolean;
  loadError: string | null;
  retryLoad: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addApplication: (castingCallId: string, castingCallTitle: string) => Promise<ApplyOutcome>;
  withdrawApplication: (castingCallId: string) => Promise<{ ok: boolean; message?: string }>;
  sendMessage: (conversationId: string, content: string) => void;
  toggleConnection: (userId: string) => void;
  addToCrewBasket: (profileId: string, role: CrewRole) => void;
  removeFromCrewBasket: (profileId: string) => void;
  clearCrewBasket: () => void;
  setCrewProjectName: (name: string) => void;
  isInCrewBasket: (profileId: string) => boolean;
  signOut: () => Promise<void>;
}

export const AppContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
