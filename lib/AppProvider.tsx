import React, { useState, useMemo, useCallback, ReactNode, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Session } from '@supabase/supabase-js';
import { AppContext, AppState, ApplyOutcome } from './store';
import { supabase, isNetworkError, NetworkError, networkErrorMessage } from './supabase';
import { createLogger } from './logger';
import { UserProfile, CastingCall, Conversation, Message, Application, CrewBasketItem, CrewRole, AppNotification, SavedSearch, DiscoverFilters, ProfileViewer } from './types';
import { getProfile, getProfiles, updateProfile as updateProfileApi } from './api/profiles';
import { getCastingCalls } from './api/castingCalls';
import { getConversations, getMessages as fetchMessages, sendMessage as sendMessageApi, markMessagesRead } from './api/messages';
import { getMyApplications, applyToCastingCall, withdrawApplication as withdrawApplicationApi } from './api/applications';
import { getBookmarks, addBookmark, removeBookmark } from './api/bookmarks';
import { getNotifications, markAllNotificationsRead } from './api/notifications';
import { getMyBlocks, blockUser as blockUserApi, unblockUser as unblockUserApi, reportUser as reportUserApi } from './api/blocks';
import { getSavedSearches, addSavedSearch, deleteSavedSearch as deleteSavedSearchApi } from './api/savedSearches';
import { getProfileViewers, recordProfileView as recordProfileViewApi } from './api/profileViews';
import { followUser, unfollowUser } from './api/connections';
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
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [profileViewers, setProfileViewers] = useState<ProfileViewer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Stable ref so retryLoad callback doesn't go stale
  const sessionRef = useRef<Session | null>(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  // Latest messages, readable inside callbacks without stale closures.
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const bookmarksRef = useRef(bookmarks);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);
  const blockedRef = useRef(blockedIds);
  useEffect(() => { blockedRef.current = blockedIds; }, [blockedIds]);
  const savedSearchesRef = useRef(savedSearches);
  useEffect(() => { savedSearchesRef.current = savedSearches; }, [savedSearches]);
  const myProfileRef = useRef(myProfile);
  useEffect(() => { myProfileRef.current = myProfile; }, [myProfile]);

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
      const [profile, allProfiles, calls, convs, apps, bmarks, notifs, blocked, searches, viewers] = await Promise.all([
        getProfile(userId),
        getProfiles(),
        getCastingCalls(),
        getConversations(userId),
        getMyApplications(userId),
        getBookmarks(userId),
        getNotifications(userId),
        getMyBlocks(userId),
        getSavedSearches(userId),
        getProfileViewers(userId),
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
      setBookmarks(bmarks);
      setNotifications(notifs);
      setBlockedIds(blocked);
      setSavedSearches(searches);
      setProfileViewers(viewers);

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

  // Persist profile edits to Supabase (when signed in) then sync local state, so
  // a failed save doesn't leave a stale local value. updateProfile stays the
  // local-only sync used by the onboarding screens after their own API writes.
  const persistProfile = useCallback(async (updates: Partial<UserProfile>): Promise<{ ok: boolean; message?: string }> => {
    const uid = sessionRef.current?.user?.id;
    if (uid) {
      const ok = await updateProfileApi(uid, updates);
      if (!ok) return { ok: false, message: 'Could not save changes. Please check your connection and try again.' };
    }
    updateProfile(updates);
    return { ok: true };
  }, [updateProfile]);

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

  // Strip any markup so message content is never rendered as HTML, and cap length.
  const sanitizeMessage = (content: string) => content.replace(/<[^>]*>/g, '').trim().slice(0, 1000);

  const putMessage = useCallback((conversationId: string, msg: Message) => {
    setMessages(prev => {
      const list = prev[conversationId] || [];
      const idx = list.findIndex(m => m.id === msg.id);
      const nextList = idx === -1 ? [...list, msg] : list.map(m => (m.id === msg.id ? msg : m));
      const updated = { ...prev, [conversationId]: nextList };
      saveMessages(updated);
      return updated;
    });
  }, []);

  const patchMessage = useCallback((conversationId: string, messageId: string, patch: Partial<Message>) => {
    setMessages(prev => {
      const list = prev[conversationId] || [];
      const updated = { ...prev, [conversationId]: list.map(m => (m.id === messageId ? { ...m, ...patch } : m)) };
      saveMessages(updated);
      return updated;
    });
  }, []);

  const setConversationPreview = useCallback((conversationId: string, content: string, timestamp: string) => {
    setConversations(prev => {
      const updated = prev.map(c => (c.id === conversationId ? { ...c, lastMessage: content, lastMessageTime: timestamp } : c));
      saveConversations(updated);
      return updated;
    });
  }, []);

  // Persist a message (client id makes retries idempotent) and reconcile status.
  const deliverMessage = useCallback(async (conversationId: string, clientId: string, content: string, myId: string) => {
    const res = await sendMessageApi(myId, conversationId, content, clientId);
    patchMessage(conversationId, clientId, res.ok ? { status: 'sent', timestamp: res.message.timestamp } : { status: 'failed' });
  }, [patchMessage]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    const clean = sanitizeMessage(content);
    if (!clean) return;
    const uid = sessionRef.current?.user?.id;
    const myId = uid ?? 'me';
    const clientId = Crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const msg: Message = { id: clientId, senderId: myId, receiverId: conversationId, content: clean, timestamp, read: false, status: uid ? 'sending' : 'sent' };
    putMessage(conversationId, msg);
    setConversationPreview(conversationId, clean, timestamp);
    if (uid) await deliverMessage(conversationId, clientId, clean, uid);
  }, [putMessage, setConversationPreview, deliverMessage]);

  const resendMessage = useCallback(async (conversationId: string, messageId: string) => {
    const uid = sessionRef.current?.user?.id;
    if (!uid) return;
    const content = (messagesRef.current[conversationId] || []).find(m => m.id === messageId)?.content;
    if (!content) return;
    patchMessage(conversationId, messageId, { status: 'sending' });
    await deliverMessage(conversationId, messageId, content, uid);
  }, [patchMessage, deliverMessage]);

  const loadConversation = useCallback(async (conversationId: string) => {
    const uid = sessionRef.current?.user?.id;
    if (!uid) return;
    try {
      const serverMsgs = await fetchMessages(uid, conversationId);
      setMessages(prev => {
        // Keep locally pending/failed messages that aren't on the server yet.
        const serverIds = new Set(serverMsgs.map(m => m.id));
        const pending = (prev[conversationId] || []).filter(
          m => (m.status === 'sending' || m.status === 'failed') && !serverIds.has(m.id),
        );
        const updated = { ...prev, [conversationId]: [...serverMsgs, ...pending] };
        saveMessages(updated);
        return updated;
      });
      markMessagesRead(uid, conversationId).catch(() => {});
      setConversations(prev => prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)));
    } catch (err: unknown) {
      log.warn('loadConversation failed', { message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const toggleConnection = useCallback(async (userId: string) => {
    const uid = sessionRef.current?.user?.id;
    if (uid === userId) return; // can't follow yourself
    const wasConnected = myProfileRef.current.connections.includes(userId);
    const apply = (connected: boolean) => setMyProfile(prev => {
      const connections = connected
        ? (prev.connections.includes(userId) ? prev.connections : [...prev.connections, userId])
        : prev.connections.filter(id => id !== userId);
      const updated = { ...prev, connections };
      saveProfile(updated);
      return updated;
    });
    apply(!wasConnected); // optimistic
    if (!uid) return;
    const ok = wasConnected ? await unfollowUser(uid, userId) : await followUser(uid, userId);
    if (!ok) apply(wasConnected); // revert
  }, []);

  const toggleBookmark = useCallback(async (castingCallId: string) => {
    const uid = sessionRef.current?.user?.id;
    const wasBookmarked = bookmarksRef.current.includes(castingCallId);
    // Optimistic toggle.
    setBookmarks(prev => (wasBookmarked ? prev.filter(id => id !== castingCallId) : [...prev, castingCallId]));
    if (!uid) return;
    const ok = wasBookmarked ? await removeBookmark(uid, castingCallId) : await addBookmark(uid, castingCallId);
    if (!ok) {
      // Revert on failure.
      setBookmarks(prev => (wasBookmarked ? [...prev, castingCallId] : prev.filter(id => id !== castingCallId)));
    }
  }, []);

  const isBookmarked = useCallback((castingCallId: string) => bookmarks.includes(castingCallId), [bookmarks]);

  const markNotificationsRead = useCallback(async () => {
    const uid = sessionRef.current?.user?.id;
    setNotifications(prev => (prev.some(n => !n.read) ? prev.map(n => ({ ...n, read: true })) : prev));
    if (uid) await markAllNotificationsRead(uid);
  }, []);

  const blockUser = useCallback(async (userId: string) => {
    const uid = sessionRef.current?.user?.id;
    if (uid === userId) return; // can't block yourself
    setBlockedIds(prev => (prev.includes(userId) ? prev : [...prev, userId]));
    if (!uid) return;
    const ok = await blockUserApi(uid, userId);
    if (!ok) setBlockedIds(prev => prev.filter(id => id !== userId)); // revert
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    const uid = sessionRef.current?.user?.id;
    const wasBlocked = blockedRef.current.includes(userId);
    setBlockedIds(prev => prev.filter(id => id !== userId));
    if (!uid) return;
    const ok = await unblockUserApi(uid, userId);
    if (!ok && wasBlocked) setBlockedIds(prev => (prev.includes(userId) ? prev : [...prev, userId])); // revert
  }, []);

  const isBlocked = useCallback((userId: string) => blockedIds.includes(userId), [blockedIds]);

  const reportUser = useCallback(async (userId: string, reason: string, details?: string) => {
    const uid = sessionRef.current?.user?.id;
    if (!uid || uid === userId) return false;
    return reportUserApi(uid, userId, reason, details ?? '');
  }, []);

  const saveSearch = useCallback(async (name: string, filters: DiscoverFilters) => {
    const uid = sessionRef.current?.user?.id;
    if (!uid) return;
    const saved = await addSavedSearch(uid, name, filters);
    if (saved) setSavedSearches(prev => [saved, ...prev]);
  }, []);

  const deleteSavedSearch = useCallback(async (id: string) => {
    const uid = sessionRef.current?.user?.id;
    const prevList = savedSearchesRef.current;
    setSavedSearches(prev => prev.filter(s => s.id !== id));
    if (uid) {
      const ok = await deleteSavedSearchApi(uid, id);
      if (!ok) setSavedSearches(prevList); // revert
    }
  }, []);

  const recordProfileView = useCallback(async (viewedId: string) => {
    const uid = sessionRef.current?.user?.id;
    if (!uid || uid === viewedId) return;
    await recordProfileViewApi(uid, viewedId);
  }, []);

  const addToCrewBasket = useCallback((profileId: string, role: CrewRole) => {
    // Can't shortlist yourself (profiles.id === auth user id).
    if (sessionRef.current?.user?.id === profileId) return;
    setCrewBasket(prev => {
      if (prev.some(item => item.profileId === profileId)) return prev; // no duplicates
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
    bookmarks,
    notifications,
    unreadNotifications: notifications.reduce((n, x) => (x.read ? n : n + 1), 0),
    blockedIds,
    savedSearches,
    profileViewers,
    isLoading,
    isOffline,
    loadError,
    retryLoad,
    updateProfile,
    persistProfile,
    toggleBookmark,
    isBookmarked,
    markNotificationsRead,
    blockUser,
    unblockUser,
    isBlocked,
    reportUser,
    saveSearch,
    deleteSavedSearch,
    recordProfileView,
    addApplication,
    withdrawApplication,
    sendMessage,
    resendMessage,
    loadConversation,
    toggleConnection,
    addToCrewBasket,
    removeFromCrewBasket,
    clearCrewBasket,
    setCrewProjectName,
    isInCrewBasket,
    signOut,
  }), [session, myProfile, profiles, castingCalls, conversations, messages, applications, crewBasket, crewProjectName, bookmarks, notifications, blockedIds, savedSearches, profileViewers, isLoading, isOffline, loadError, retryLoad, updateProfile, persistProfile, toggleBookmark, isBookmarked, markNotificationsRead, blockUser, unblockUser, isBlocked, reportUser, saveSearch, deleteSavedSearch, recordProfileView, addApplication, withdrawApplication, sendMessage, resendMessage, loadConversation, toggleConnection, addToCrewBasket, removeFromCrewBasket, clearCrewBasket, setCrewProjectName, isInCrewBasket, signOut]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
