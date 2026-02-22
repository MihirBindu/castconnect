import { createContext, useContext } from 'react';
import { UserProfile, CastingCall, Conversation, Message, Application } from './types';

export interface AppState {
  myProfile: UserProfile;
  profiles: UserProfile[];
  castingCalls: CastingCall[];
  conversations: Conversation[];
  messages: Record<string, Message[]>;
  applications: Application[];
  updateProfile: (updates: Partial<UserProfile>) => void;
  addApplication: (castingCallId: string, castingCallTitle: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  toggleConnection: (userId: string) => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}
