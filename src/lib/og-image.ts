import { createSupabaseAdminClient } from './supabase/server';

/**
 * Processa il campo OG image da un FormData.
 * Priorità: file caricato > URL esterno > valore attuale
 * Restituisce la URL finale da salvare in DB oppure null.
 */
export async function processOgImage(formData: FormData): Promise<string | null> {
  const file    = formData.get('seo_og_image_file') as File | null;
  const urlExt  = (formData.get('seo_og_image_url')     as string)?.trim();
  const current = (formData.get('seo_og_image_current') as string)?.trim();

  // 1. File caricato → upload su Supabase Storage bucket "og-images" (pubblico)
  if (file && file.size > 0) {
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `og-${Date.now()}.${ext}`;
    const buffer   = new Uint8Array(await file.arrayBuffer());

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage
      .from('og-images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });

    if (!error) {
      const { data } = supabase.storage
        .from('og-images')
        .getPublicUrl(fileName);
      return data.publicUrl;
    }
    console.error('[og-image] Errore upload:', error.message);
  }

  // 2. URL esterno inserito
  if (urlExt) return urlExt;

  // 3. Mantieni il valore attuale se non è stato cambiato niente
  return current || null;
}
