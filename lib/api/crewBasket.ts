import { supabase } from '../supabase';
import { CrewBasketItem, CrewRole } from '../types';

export async function getOrCreateBasket(ownerId: string, projectName: string): Promise<string> {
  const { data: existing } = await supabase
    .from('crew_baskets')
    .select('id')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data } = await supabase
    .from('crew_baskets')
    .insert({ owner_id: ownerId, project_name: projectName })
    .select('id')
    .single();

  return data?.id ?? '';
}

export async function getBasketItems(basketId: string): Promise<CrewBasketItem[]> {
  const { data, error } = await supabase
    .from('crew_basket_items')
    .select('*')
    .eq('basket_id', basketId)
    .order('added_at', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({
    profileId: row.profile_id,
    assignedRole: row.assigned_role as CrewRole,
    addedAt: row.added_at,
  }));
}

export async function addToBasket(basketId: string, profileId: string, assignedRole: CrewRole): Promise<void> {
  await supabase
    .from('crew_basket_items')
    .upsert({ basket_id: basketId, profile_id: profileId, assigned_role: assignedRole });
}

export async function removeFromBasket(basketId: string, profileId: string): Promise<void> {
  await supabase
    .from('crew_basket_items')
    .delete()
    .eq('basket_id', basketId)
    .eq('profile_id', profileId);
}

export async function clearBasket(basketId: string): Promise<void> {
  await supabase.from('crew_basket_items').delete().eq('basket_id', basketId);
}

export async function updateBasketName(basketId: string, projectName: string): Promise<void> {
  await supabase.from('crew_baskets').update({ project_name: projectName }).eq('id', basketId);
}
