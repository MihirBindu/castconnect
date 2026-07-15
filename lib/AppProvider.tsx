import React, { useState, useMemo, useCallback, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Session } from '@supabase/supabase-js';
import { AppContext, AppState, ApplyOutcome } from './store';
import { supabase, isNetworkError, NetworkError, networkErrorMessage } from './supabase';
import { createLogger } from './logger';
import { UserProfile, CastingCall, Conversation, Message, Application, CrewBasketItem, CrewRole } from './types';
import { getProfile, getProfiles } from './api/profiles';
import { getCastingCalls } from './api/castingCalls';
import { getConversations, getMessages as fetchMessages } from './api/messages';
import { getMyApplications, applyToCastingCall, withdrawApplication as withdrawApplicationApi } from './api/applications';
import {
  MY_PROFILE,
  SAMPLE_PROFILES,
  SAMPLE_CASTING_CALLS,
  SAMPLE_CONVERSATIONS,
  SAMPLE_MESSAGES,
  SAMPLE_APPLICATIONS,
} from './mock-data';

const log = createLogger('AppProvider');

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
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stable ref so retryLoad callback doesn't go stale
  const sessionRef = useRef<Session | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (session?.user) {
      loadFromSupabase(session.user.id);
    } else {
      loadData();
    }
  }, [session]);

  const loadFromSupabase = async (userId: string) => {
    log.debug('loadFromSupabase start', { userId });
    setIsLoading(true);
    setLoadError(null);
    setIsOffline(false);
    try {
      const [profile, allProfiles, calls, convs, apps] = await Promise.all([
        getProfile(userId),
        getProfiles(),
        getCastingCalls(),
        getConversations(userId),
        getMyApplications(userId),
      ]);

      if (profile) {
        setMyProfile(profile);
      } else {
        log.warn('loadFromSupabase: profile not found', { userId });
      }
      if (allProfiles.length) setProfiles(allProfiles.filter(p => p.id !== userId));
      if (calls.length) setCastingCalls(calls);
      if (convs.length) setConversations(convs);
      if (apps.length) setApplications(apps);

      log.info('loadFromSupabase complete', {
        profiles: allProfiles.length,
        calls: calls.length,
        convs: convs.length,
        apps: apps.length,
      });
    } catch (err: unknown) {
      if (err instanceof NetworkError || isNetworkError(err)) {
        log.warn('loadFromSupabase: network unavailable, using cached data', { userId });
        setIsOffline(true);
        // Fall back to whatever is in local storage; keep mock data if storage is empty
        await loadData({ silent: true });
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        log.error('loadFromSupabase failed', { message: msg });
        setLoadError('Failed to load your data. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async (opts?: { silent?: boolean }) => {
    log.debug('loadData (local storage)');
    if (!opts?.silent) {
      setIsLoading(true);
      setLoadError(null);
    }
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
      log.info('loadData (local storage) complete');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error('loadData (local storage) failed', { message: msg });
      if (!opts?.silent) setLoadError('Failed to load saved data.');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  const retryLoad = useCallback(() => {
    const s = sessionRef.current;
    if (s?.user) {
      loadFromSupabase(s.user.id);
    } else {
      loadData();
    }
  }, []);

  // ── Persistence helpers ──────────────────────────────────────────────────

  const saveProfile = async (profile: UserProfile) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile)); } catch { /* no-op */ }
  };
  const saveApplications = async (apps: Application[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps)); } catch { /* no-op */ }
  };
  const saveConversations = async (convs: Conversation[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(convs)); } catch { /* no-op */ }
  };
  const saveMessages = async (msgs: Record<string, Message[]>) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs)); } catch { /* no-op */ }
  };
  const saveCrewBasket = async (items: CrewBasketItem[]) => {
    try { await AsyncStorage.setItem(STORAGE_KEYS.CREW_BASKET, JSON.stringify(items)); } catch { /* no-op */ }
  };

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setMyProfile(prev => {
      const updated = { ...prev, ...updates };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const addLocalApplication = useCallback((castingCallId: string, castingCallTitle: string, applicantId: string) => {
    setApplications(prev => {
      if (prev.some(a => a.castingCallId === castingCallId)) return prev;
      const newApp: Application = {
        id: Crypto.randomUUID(),
        castingCallId,
        castingCallTitle,
        applicantId,
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

  const addApplication = useCallback(async (castingCallId: string, castingCallTitle: string): Promise<ApplyOutcome> => {
    const uid = sessionRef.current?.user?.id;
    if (uid) {
      // Persist first — the unique constraint + trigger make this the source of
      // truth (idempotent, closed/deadline enforced) — then reflect locally.
      const res = await applyToCastingCall(castingCallId, uid, '');
      if (!res.ok) return { ok: false, message: res.message };
      addLocalApplication(castingCallId, castingCallTitle, uid);
      return { ok: true, alreadyApplied: res.alreadyApplied };
    }
    // Demo / unauthenticated → local only.
    addLocalApplication(castingCallId, castingCallTitle, 'me');
    return { ok: true, alreadyApplied: false };
  }, [addLocalApplication]);

  const withdrawApplication = useCallback(async (castingCallId: string): Promise<{ ok: boolean; message?: string }> => {
    const uid = sessionRef.current?.user?.id;
    if (uid) {
      const res = await withdrawApplicationApi(castingCallId, uid);
      if (!res.ok) return res;
    }
    setApplications(prev => {
      const updated = prev.filter(a => a.castingCallId !== castingCallId);
      saveApplications(updated);
      return updated;
    });
    return { ok: true };
  }, []);

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
    session,
    myProfile,
    profiles,
    castingCalls,
    conversations,
    messages,
    applications,
    crewBasket,
    crewProjectName,
    isLoading,
    isOffline,
    loadError,
    retryLoad,
    updateProfile,
    addApplication,
    withdrawApplication,
    sendMessage,
    toggleConnection,
    addToCrewBasket,
    removeFromCrewBasket,
    clearCrewBasket,
    setCrewProjectName,
    isInCrewBasket,
    signOut,
  }), [session, myProfile, profiles, castingCalls, conversations, messages, applications, crewBasket, crewProjectName, isLoading, isOffline, loadError, retryLoad, updateProfile, addApplication, withdrawApplication, sendMessage, toggleConnection, addToCrewBasket, removeFromCrewBasket, clearCrewBasket, setCrewProjectName, isInCrewBasket, signOut]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
