import { supabase } from '../supabase';
import { createLogger } from '../logger';
import { CrewBasketItem, CrewRole } from '../types';

const log = createLogger('api/crewBasket');

export async function getOrCreateBasket(ownerId: string, projectName: string): Promise<string> {
  log.debug('getOrCreateBasket', { ownerId, projectName });
  try {
    const { data: existing, error: fetchError } = await supabase
      .from('crew_baskets')
      .select('id')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      log.error('getOrCreateBasket fetch failed', { message: fetchError.message });
      return '';
    }

    if (existing) {
      log.debug('Using existing basket', { basketId: existing.id });
      return existing.id;
    }

    const { data, error } = await supabase
      .from('crew_baskets')
      .insert({ owner_id: ownerId, project_name: projectName })
      .select('id')
      .single();

    if (error) {
      log.error('getOrCreateBasket create failed', { message: error.message });
      return '';
    }

    log.info('Created new basket', { basketId: data?.id });
    return data?.id ?? '';
  } catch (err: unknown) {
    log.error('getOrCreateBasket threw', { message: err instanceof Error ? err.message : String(err) });
    return '';
  }
}

export async function getBasketItems(basketId: string): Promise<CrewBasketItem[]> {
  log.debug('getBasketItems', { basketId });
  if (!basketId) {
    log.warn('getBasketItems called with empty basketId');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('crew_basket_items')
      .select('*')
      .eq('basket_id', basketId)
      .order('added_at', { ascending: true });

    if (error) {
      log.error('getBasketItems failed', { basketId, code: error.code, message: error.message });
      return [];
    }

    log.info('getBasketItems success', { basketId, count: data?.length ?? 0 });
    return (data ?? []).map((row) => ({
      profileId: row.profile_id,
      assignedRole: row.assigned_role as CrewRole,
      addedAt: row.added_at,
    }));
  } catch (err: unknown) {
    log.error('getBasketItems threw', { message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

export async function addToBasket(basketId: string, profileId: string, assignedRole: CrewRole): Promise<boolean> {
  log.debug('addToBasket', { basketId, profileId, assignedRole });
  if (!basketId) {
    log.warn('addToBasket called with empty basketId');
    return false;
  }
  try {
    const { error } = await supabase
      .from('crew_basket_items')
      .upsert({ basket_id: basketId, profile_id: profileId, assigned_role: assignedRole });

    if (error) {
      log.error('addToBasket failed', { code: error.code, message: error.message });
      return false;
    }

    log.info('addToBasket success', { basketId, profileId });
    return true;
  } catch (err: unknown) {
    log.error('addToBasket threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function removeFromBasket(basketId: string, profileId: string): Promise<boolean> {
  log.debug('removeFromBasket', { basketId, profileId });
  try {
    const { error } = await supabase
      .from('crew_basket_items')
      .delete()
      .eq('basket_id', basketId)
      .eq('profile_id', profileId);

    if (error) {
      log.error('removeFromBasket failed', { code: error.code, message: error.message });
      return false;
    }

    log.info('removeFromBasket success', { basketId, profileId });
    return true;
  } catch (err: unknown) {
    log.error('removeFromBasket threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function clearBasket(basketId: string): Promise<boolean> {
  log.debug('clearBasket', { basketId });
  try {
    const { error } = await supabase
      .from('crew_basket_items')
      .delete()
      .eq('basket_id', basketId);

    if (error) {
      log.error('clearBasket failed', { code: error.code, message: error.message });
      return false;
    }

    log.info('clearBasket success', { basketId });
    return true;
  } catch (err: unknown) {
    log.error('clearBasket threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function updateBasketName(basketId: string, projectName: string): Promise<boolean> {
  log.debug('updateBasketName', { basketId, projectName });
  try {
    const { error } = await supabase
      .from('crew_baskets')
      .update({ project_name: projectName })
      .eq('id', basketId);

    if (error) {
      log.error('updateBasketName failed', { code: error.code, message: error.message });
      return false;
    }

    log.info('updateBasketName success', { basketId });
    return true;
  } catch (err: unknown) {
    log.error('updateBasketName threw', { message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
