import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { CastingCall } from '../types';

const log = createLogger('api/castingCalls');

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
  log.debug('getCastingCalls');
  try {
    const { data, error } = await supabase
      .from('casting_calls')
      .select('*, profiles(name, is_verified)')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getCastingCalls failed', { code: error.code, message: error.message });
      return [];
    }

    log.info('getCastingCalls success', { count: data?.length ?? 0 });
    return (data ?? []).map(toCastingCall);
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getCastingCalls threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function getCastingCall(id: string): Promise<CastingCall | null> {
  log.debug('getCastingCall', { id });
  try {
    const { data, error } = await supabase
      .from('casting_calls')
      .select('*, profiles(name, is_verified)')
      .eq('id', id)
      .single();

    if (error) {
      log.error('getCastingCall failed', { id, code: error.code, message: error.message });
      return null;
    }
    if (!data) {
      log.warn('getCastingCall not found', { id });
      return null;
    }

    log.info('getCastingCall success', { id });
    return toCastingCall(data);
  } catch (err: unknown) {
    if (isNetworkError(err)) { log.warn('getCastingCall: network unavailable', { id }); return null; }
    log.error('getCastingCall threw', { id, message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function createCastingCall(
  call: Omit<CastingCall, 'id' | 'postedByName' | 'postedByVerified' | 'applicantCount' | 'createdAt'>
): Promise<CastingCall | null> {
  log.debug('createCastingCall', { title: call.title });
  try {
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

    if (error) {
      log.error('createCastingCall failed', { code: error.code, message: error.message });
      return null;
    }

    log.info('createCastingCall success', { id: data?.id });
    return data ? toCastingCall(data) : null;
  } catch (err: unknown) {
    if (isNetworkError(err)) { log.warn('createCastingCall: network unavailable'); return null; }
    log.error('createCastingCall threw', { message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
