import { supabase } from '../supabase';
import { CastingCall } from '../types';

function toCastingCall(row: Record<string, unknown>): CastingCall {
  const poster = (row.profiles as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    roleNeeded: row.role_needed as string,
    projectType: row.project_type as CastingCall['projectType'],
    projectName: row.project_name as string,
    location: row.location as string,
    compensation: row.compensation as string,
    deadline: row.deadline as string,
    postedBy: row.posted_by as string,
    postedByName: (poster.name as string) ?? '',
    postedByVerified: (poster.is_verified as boolean) ?? false,
    skillsRequired: (row.skills_required as string[]) ?? [],
    experienceLevel: row.experience_level as string,
    status: row.status as CastingCall['status'],
    applicantCount: row.applicant_count as number,
    createdAt: row.created_at as string,
  };
}

export async function getCastingCalls(): Promise<CastingCall[]> {
  const { data, error } = await supabase
    .from('casting_calls')
    .select('*, profiles(name, is_verified)')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(toCastingCall);
}

export async function getCastingCall(id: string): Promise<CastingCall | null> {
  const { data, error } = await supabase
    .from('casting_calls')
    .select('*, profiles(name, is_verified)')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return toCastingCall(data);
}

export async function createCastingCall(
  call: Omit<CastingCall, 'id' | 'postedByName' | 'postedByVerified' | 'applicantCount' | 'createdAt'>
): Promise<CastingCall | null> {
  const { data, error } = await supabase
    .from('casting_calls')
    .insert({
      title: call.title,
      description: call.description,
      role_needed: call.roleNeeded,
      project_type: call.projectType,
      project_name: call.projectName,
      location: call.location,
      compensation: call.compensation,
      deadline: call.deadline,
      posted_by: call.postedBy,
      skills_required: call.skillsRequired,
      experience_level: call.experienceLevel,
      status: call.status,
    })
    .select('*, profiles(name, is_verified)')
    .single();
  if (error || !data) return null;
  return toCastingCall(data);
}
