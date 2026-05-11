import { supabase } from '../supabase';
import { Application } from '../types';

export async function getMyApplications(userId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*, casting_calls(title), profiles(name)')
    .eq('applicant_id', userId)
    .order('applied_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    castingCallId: row.casting_call_id,
    castingCallTitle: row.casting_calls?.title ?? '',
    applicantId: row.applicant_id,
    applicantName: row.profiles?.name ?? '',
    status: row.status,
    appliedAt: row.applied_at,
    note: row.note,
  }));
}

export async function applyToCastingCall(castingCallId: string, applicantId: string, note = ''): Promise<boolean> {
  const { error } = await supabase
    .from('applications')
    .insert({ casting_call_id: castingCallId, applicant_id: applicantId, note });
  return !error;
}

export async function hasApplied(castingCallId: string, applicantId: string): Promise<boolean> {
  const { data } = await supabase
    .from('applications')
    .select('id')
    .eq('casting_call_id', castingCallId)
    .eq('applicant_id', applicantId)
    .maybeSingle();
  return !!data;
}
