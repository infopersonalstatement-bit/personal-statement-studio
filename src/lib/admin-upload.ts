import type { SupabaseClient } from '@supabase/supabase-js';

export async function uploadPdfFromB64(
  supabase: SupabaseClient,
  pdfB64: string,
  nome: string,
): Promise<string> {
  const buffer = Buffer.from(pdfB64, 'base64');
  const safeName = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const fileName = `${safeName}-${Date.now()}.pdf`;
  const filePath = `pdfs/${fileName}`;

  const { error } = await supabase.storage
    .from('prodotti-digitali')
    .upload(filePath, buffer, { contentType: 'application/pdf', upsert: false });

  if (error) throw new Error(error.message);
  return filePath;
}

export async function uploadOgImageFromB64(
  supabase: SupabaseClient,
  imageB64: string,
  ext = 'jpg',
): Promise<string> {
  const buffer = Buffer.from(imageB64, 'base64');
  const fileName = `og-${Date.now()}.${ext.replace(/^\./, '')}`;
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  const { error } = await supabase.storage
    .from('og-images')
    .upload(fileName, buffer, { contentType: mime, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('og-images').getPublicUrl(fileName);
  return data.publicUrl;
}
