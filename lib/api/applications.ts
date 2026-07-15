import { supabase, isNetworkError, NetworkError, networkErrorMessage } from '../supabase';
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

export type ApplyResult =
  | { ok: true; alreadyApplied: boolean }
  | { ok: false; reason: 'closed' | 'network' | 'unauthorized' | 'error'; message: string };

/**
 * Applies to a casting call. Idempotent — the unique(casting_call_id,
 * applicant_id) constraint means a retried or double-tapped submit resolves to
 * `alreadyApplied` instead of a duplicate. Closed / past-deadline calls are
 * rejected by the check_application_open trigger and surfaced as `closed`.
 */
export async function applyToCastingCall(castingCallId: string, applicantId: string, note = ''): Promise<ApplyResult> {
  log.debug('applyToCastingCall', { castingCallId, applicantId });
  try {
    const { error } = await supabase
      .from('applications')
      .insert({ casting_call_id: castingCallId, applicant_id: applicantId, note });

    if (!error) {
      log.info('applyToCastingCall success', { castingCallId, applicantId });
      return { ok: true, alreadyApplied: false };
    }

    const code = error.code ?? '';
    // Unique violation → already applied. Treat as a successful no-op.
    if (code === '23505') {
      log.info('applyToCastingCall — already applied', { castingCallId, applicantId });
      return { ok: true, alreadyApplied: true };
    }
    if (isNetworkError({ message: error.message })) {
      return { ok: false, reason: 'network', message: networkErrorMessage() };
    }
    if (code === '42501' || code === 'PGRST301' || /jwt|unauthor|permission|policy|rls/i.test(error.message)) {
      return { ok: false, reason: 'unauthorized', message: 'Your session has expired. Please sign in again.' };
    }
    // Raised by the check_application_open trigger (closed / deadline passed).
    if (code === 'P0001' || /closed|deadline|no longer exists/i.test(error.message)) {
      return { ok: false, reason: 'closed', message: error.message || 'This casting call is no longer accepting applications.' };
    }
    log.error('applyToCastingCall failed', { code, message: error.message });
    return { ok: false, reason: 'error', message: 'Could not submit your application. Please try again.' };
  } catch (err: unknown) {
    if (isNetworkError(err)) {
      return { ok: false, reason: 'network', message: networkErrorMessage() };
    }
    log.error('applyToCastingCall threw', { message: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: 'error', message: 'Something went wrong. Please try again.' };
  }
}

/** Withdraws (deletes) the user's own application. Idempotent — a missing row is still "ok". */
export async function withdrawApplication(castingCallId: string, applicantId: string): Promise<{ ok: boolean; message?: string }> {
  log.debug('withdrawApplication', { castingCallId, applicantId });
  try {
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('casting_call_id', castingCallId)
      .eq('applicant_id', applicantId);

    if (error) {
      if (isNetworkError({ message: error.message })) return { ok: false, message: networkErrorMessage() };
      log.error('withdrawApplication failed', { code: error.code, message: error.message });
      return { ok: false, message: 'Could not withdraw your application. Please try again.' };
    }
    log.info('withdrawApplication success', { castingCallId, applicantId });
    return { ok: true };
  } catch (err: unknown) {
    if (isNetworkError(err)) return { ok: false, message: networkErrorMessage() };
    log.error('withdrawApplication threw', { message: err instanceof Error ? err.message : String(err) });
    return { ok: false, message: 'Something went wrong. Please try again.' };
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
    if (isNetworkError(err)) {
      log.warn('hasApplied: network unavailable', { castingCallId, applicantId });
      return false;
    }
    log.error('hasApplied threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
