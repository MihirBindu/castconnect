import { supabase, isNetworkError, NetworkError } from '../supabase';
import { createLogger } from '../logger';
import { Application } from '../types';

const log = createLogger('api/applications');

export async function getMyApplications(userId: string): Promise<Application[]> {
  log.debug('getMyApplications', { userId });
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*, casting_calls(title), profiles(name)')
      .eq('applicant_id', userId)
      .order('applied_at', { ascending: false });

    if (error) {
      if (isNetworkError({ message: error.message })) throw new NetworkError(error.message);
      log.error('getMyApplications failed', { code: error.code, message: error.message });
      return [];
    }

    log.info('getMyApplications success', { count: data?.length ?? 0 });
    return (data ?? []).map((row) => ({
      id: row.id,
      castingCallId: row.casting_call_id,
      castingCallTitle: row.casting_calls?.title ?? '',
      applicantId: row.applicant_id,
      applicantName: row.profiles?.name ?? '',
      status: row.status,
      appliedAt: row.applied_at,
      note: row.note,
    }));
  } catch (err: unknown) {
    if (err instanceof NetworkError) throw err;
    if (isNetworkError(err)) throw new NetworkError(err instanceof Error ? err.message : undefined);
    log.error('getMyApplications threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function applyToCastingCall(castingCallId: string, applicantId: string, note = ''): Promise<boolean> {
  log.debug('applyToCastingCall', { castingCallId, applicantId });
  try {
    const alreadyApplied = await hasApplied(castingCallId, applicantId);
    if (alreadyApplied) {
      log.warn('applyToCastingCall — already applied', { castingCallId, applicantId });
      return false;
    }

    const { error } = await supabase
      .from('applications')
      .insert({ casting_call_id: castingCallId, applicant_id: applicantId, note });

    if (error) {
      log.error('applyToCastingCall failed', { code: error.code, message: error.message });
      return false;
    }

    log.info('applyToCastingCall success', { castingCallId, applicantId });
    return true;
  } catch (err: unknown) {
    if (isNetworkError(err)) { log.warn('applyToCastingCall: network unavailable', { castingCallId }); return false; }
    log.error('applyToCastingCall threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function hasApplied(castingCallId: string, applicantId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('applications')
      .select('id')
      .eq('casting_call_id', castingCallId)
      .eq('applicant_id', applicantId)
      .maybeSingle();

    if (error) {
      log.warn('hasApplied check failed', { message: error.message });
      return false;
    }
    return !!data;
  } catch (err: unknown) {
    if (isNetworkError(err)) { log.warn('hasApplied: network unavailable', { castingCallId }); return false; }
    log.error('hasApplied threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
