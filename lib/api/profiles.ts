import { supabase } from '../supabase';
import { UserProfile } from '../types';

function toProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    name: row.name as string,
    role: row.role as UserProfile['role'],
    title: row.title as string,
    crewRole: row.crew_role as UserProfile['crewRole'],
    bio: row.bio as string,
    skills: (row.skills as string[]) ?? [],
    experience: row.experience as string,
    experienceYears: row.experience_years as number,
    location: row.location as string,
    availability: row.availability as UserProfile['availability'],
    portfolioLinks: (row.portfolio_links as string[]) ?? [],
    profileImage: row.profile_image as string | null,
    contactEmail: row.contact_email as string,
    contactPhone: row.contact_phone as string,
    isVerified: row.is_verified as boolean,
    industryTypes: (row.industry_types as UserProfile['industryTypes']) ?? [],
    connections: [],
    dayRate: row.day_rate as number,
    rating: row.rating as number,
    reviewCount: row.review_count as number,
    createdAt: row.created_at as string,
  };
}

export async function getProfile(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  const connections = await getConnectionIds(id);
  return { ...toProfile(data), connections };
}

export async function getProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('rating', { ascending: false });
  if (error || !data) return [];
  return data.map(toProfile);
}

export async function updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined)           payload.name = updates.name;
  if (updates.role !== undefined)           payload.role = updates.role;
  if (updates.title !== undefined)          payload.title = updates.title;
  if (updates.crewRole !== undefined)       payload.crew_role = updates.crewRole;
  if (updates.bio !== undefined)            payload.bio = updates.bio;
  if (updates.skills !== undefined)         payload.skills = updates.skills;
  if (updates.experience !== undefined)     payload.experience = updates.experience;
  if (updates.experienceYears !== undefined) payload.experience_years = updates.experienceYears;
  if (updates.location !== undefined)       payload.location = updates.location;
  if (updates.availability !== undefined)   payload.availability = updates.availability;
  if (updates.portfolioLinks !== undefined) payload.portfolio_links = updates.portfolioLinks;
  if (updates.profileImage !== undefined)   payload.profile_image = updates.profileImage;
  if (updates.contactEmail !== undefined)   payload.contact_email = updates.contactEmail;
  if (updates.contactPhone !== undefined)   payload.contact_phone = updates.contactPhone;
  if (updates.industryTypes !== undefined)  payload.industry_types = updates.industryTypes;
  if (updates.dayRate !== undefined)        payload.day_rate = updates.dayRate;

  await supabase.from('profiles').update(payload).eq('id', id);
}

async function getConnectionIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('connections')
    .select('following_id')
    .eq('follower_id', userId);
  return (data ?? []).map((r) => r.following_id);
}

export async function toggleConnection(myId: string, targetId: string): Promise<void> {
  const { data } = await supabase
    .from('connections')
    .select('follower_id')
    .eq('follower_id', myId)
    .eq('following_id', targetId)
    .maybeSingle();

  if (data) {
    await supabase.from('connections').delete().eq('follower_id', myId).eq('following_id', targetId);
  } else {
    await supabase.from('connections').insert({ follower_id: myId, following_id: targetId });
  }
}
