import React, { useState, useMemo, useCallback, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Session } from '@supabase/supabase-js';
import { AppContext, AppState } from './store';
import { supabase } from './supabase';
import { UserProfile, CastingCall, Conversation, Message, Application, CrewBasketItem, CrewRole } from './types';
import { getProfile, getProfiles } from './api/profiles';
import { getCastingCalls } from './api/castingCalls';
import { getConversations, getMessages as fetchMessages } from './api/messages';
import { getMyApplications } from './api/applications';
import {
  MY_PROFILE,
  SAMPLE_PROFILES,
  SAMPLE_CASTING_CALLS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_APPLICATIONS,
} from './mock-data';

const STORAGE_KEYS = {
  PROFILE: '@cc_profile',
  APPLICATIONS: '@cc_applications',
  CONVERSATIONS: '@cc_conversations',
  MESSAGES: '@cc_messages',
  CREW_BASKET: '@cc_crew_basket',
  CREW_PROJECT: '@cc_crew_project',
};

export function AppProvider({ children, session }: { children: ReactNode; session: Session | null }) {
  const [myProfile, setMyProfile] = useState<UserProfile>(MY_PROFILE);
  const [profiles, setProfiles] = useState<UserProfile[]>(SAMPLE_PROFILES);
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>(SAMPLE_CASTING_CALLS);
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);
  const [messages, setMessages] = useState<Record<string, Message[]>>(SAMPLE_MESSAGES);
  const [applications, setApplications] = useState<Application[]>(SAMPLE_APPLICATIONS);
  const [crewBasket, setCrewBasket] = useState<CrewBasketItem[]>([]);
  const [crewProjectName, setCrewProjectNameState] = useState('My Production');

  useEffect(() => {
    if (session?.user) {
      loadFromSupabase(session.user.id);
    } else {
      loadData();
    }
  }, [session]);

  const loadFromSupabase = async (userId: string) => {
    const [profile, allProfiles, calls, convs, apps] = await Promise.all([
      getProfile(userId),
      getProfiles(),
      getCastingCalls(),
      getConversations(userId),
      getMyApplications(userId),
    ]);
    if (profile) setMyProfile(profile);
    if (allProfiles.length) setProfiles(allProfiles.filter(p => p.id !== userId));
    if (calls.length) setCastingCalls(calls);
    if (convs.length) setConversations(convs);
    if (apps.length) setApplications(apps);
  };

  const loadData = async () => {
    try {
      const [profileData, appData, convData, msgData, crewData, crewProjData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.APPLICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.CONVERSATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
        AsyncStorage.getItem(STORAGE_KEYS.CREW_BASKET),
        AsyncStorage.getItem(STORAGE_KEYS.CREW_PROJECT),
      ]);
      if (profileData) setMyProfile(JSON.parse(profileData));
      if (appData) setApplications(JSON.parse(appData));
      if (convData) setConversations(JSON.parse(convData));
      if (msgData) setMessages(JSON.parse(msgData));
      if (crewData) setCrewBasket(JSON.parse(crewData));
      if (crewProjData) setCrewProjectNameState(crewProjData);
    } catch (e) {
      console.log('Error loading data:', e);
    }
  };

  const saveProfile = async (profile: UserProfile) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)); } catch (e) { console.log('Error saving:', e); }
  };
  const saveApplications = async (apps: Application[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps)); } catch (e) { console.log('Error saving:', e); }
  };
  const saveConversations = async (convs: Conversation[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs)); } catch (e) { console.log('Error saving:', e); }
  };
  const saveMessages = async (msgs: Record<string, Message[]>) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs)); } catch (e) { console.log('Error saving:', e); }
  };
  const saveCrewBasket = async (items: CrewBasketItem[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.CREW_BASKET, JSON.stringify(items)); } catch (e) { console.log('Error saving:', e); }
  };

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setMyProfile(prev => {
      const updated = { ...prev, ...updates };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const addApplication = useCallback((castingCallId: string, castingCallTitle: string) => {
    setApplications(prev => {
      if (prev.some(a => a.castingCallId === castingCallId)) return prev;
      const newApp: Application = {
        id: Crypto.randomUUID(),
        castingCallId,
        castingCallTitle,
        applicantId: 'me',
        applicantName: myProfile.name,
        status: 'applied',
        appliedAt: new Date().toISOString(),
        note: '',
      };
      const updated = [...prev, newApp];
      saveApplications(updated);
      return updated;
    });
  }, [myProfile.name]);

  const sendMessage = useCallback((conversationId: string, content: string) => {
    const newMsg: Message = {
      id: Crypto.randomUUID(),
      senderId: 'me',
      receiverId: conversations.find(c => c.id === conversationId)?.participantId || '',
      content,
      timestamp: new Date().toISOString(),
      read: true,
    };

    setMessages(prev => {
      const convMessages = prev[conversationId] || [];
      const updated = { ...prev, [conversationId]: [...convMessages, newMsg] };
      saveMessages(updated);
      return updated;
    });

    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastMessageTime: newMsg.timestamp }
          : c
      );
      saveConversations(updated);
      return updated;
    });
  }, [conversations]);

  const toggleConnection = useCallback((userId: string) => {
    setMyProfile(prev => {
      const isConnected = prev.connections.includes(userId);
      const updated = {
        ...prev,
        connections: isConnected
          ? prev.connections.filter(id => id !== userId)
          : [...prev.connections, userId],
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const addToCrewBasket = useCallback((profileId: string, role: CrewRole) => {
    setCrewBasket(prev => {
      if (prev.some(item => item.profileId === profileId)) return prev;
      const updated = [...prev, { profileId, assignedRole: role, addedAt: new Date().toISOString() }];
      saveCrewBasket(updated);
      return updated;
    });
  }, []);

  const removeFromCrewBasket = useCallback((profileId: string) => {
    setCrewBasket(prev => {
      const updated = prev.filter(item => item.profileId !== profileId);
      saveCrewBasket(updated);
      return updated;
    });
  }, []);

  const clearCrewBasket = useCallback(() => {
    setCrewBasket([]);
    saveCrewBasket([]);
  }, []);

  const setCrewProjectName = useCallback((name: string) => {
    setCrewProjectNameState(name);
    AsyncStorage.setItem(STORAGE_KEYS.CREW_PROJECT, name).catch(() => {});
  }, []);

  const isInCrewBasket = useCallback((profileId: string) => {
    return crewBasket.some(item => item.profileId === profileId);
  }, [crewBasket]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AppState>(() => ({
    myProfile,
    profiles,
    castingCalls,
    conversations,
    messages,
    applications,
    crewBasket,
    crewProjectName,
    updateProfile,
    addApplication,
    sendMessage,
    toggleConnection,
    addToCrewBasket,
    removeFromCrewBasket,
    clearCrewBasket,
    setCrewProjectName,
    isInCrewBasket,
    signOut,
  }), [myProfile, profiles, castingCalls, conversations, messages, applications, crewBasket, crewProjectName, updateProfile, addApplication, sendMessage, toggleConnection, addToCrewBasket, removeFromCrewBasket, clearCrewBasket, setCrewProjectName, isInCrewBasket, signOut]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
