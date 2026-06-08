/**
 * Helper per traduzione automatica via OpenAI o4-mini.
 * Una singola chiamata traduce tutti i campi nelle 4 lingue target.
 * Costo stimato: ~0.01€ per prodotto/articolo.
 */

export type TranslatableLang = 'en' | 'fr' | 'es' | 'de';
export const TARGET_LANGS: TranslatableLang[] = ['en', 'fr', 'es', 'de'];

export type TranslationFields = Record<string, string | null>;
export type TranslationResult = Record<TranslatableLang, TranslationFields>;

const LANG_NAMES: Record<TranslatableLang, string> = {
  en: 'English',
  fr: 'French (France)',
  es: 'Spanish (Spain)',
  de: 'German',
};

/**
 * Traduce un set di campi dall'italiano in EN, FR, ES, DE con una sola chiamata API.
 * I valori null/vuoti vengono ignorati.
 * I tag HTML vengono preservati.
 */
export async function translateFields(
  fields: TranslationFields,
  context?: string,
): Promise<TranslationResult> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurata su Vercel');

  // Filtra campi vuoti
  const nonEmpty = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v && v.trim()),
  );

  if (Object.keys(nonEmpty).length === 0) {
    return { en: {}, fr: {}, es: {}, de: {} };
  }

  const langList = TARGET_LANGS.map((l) => `"${l}": "${LANG_NAMES[l]}"`).join(', ');

  const systemPrompt = `You are a professional translator for a digital products website${context ? ` selling ${context}` : ''}.
Translate Italian content to the target languages.
Rules:
- Preserve all HTML tags and attributes exactly as-is
- Maintain the same tone (elegant, professional, aspirational)
- Return ONLY a valid JSON object — no markdown, no explanation
- For missing or null values, return empty string ""
- Translate naturally, not word-for-word`;

  const userPrompt = `Translate these Italian fields to the following languages: ${langList}

Input fields (Italian):
${JSON.stringify(nonEmpty, null, 2)}

Return a JSON object with this exact structure:
{
  "en": { ${Object.keys(nonEmpty).map((k) => `"${k}": "..."`).join(', ')} },
  "fr": { ${Object.keys(nonEmpty).map((k) => `"${k}": "..."`).join(', ')} },
  "es": { ${Object.keys(nonEmpty).map((k) => `"${k}": "..."`).join(', ')} },
  "de": { ${Object.keys(nonEmpty).map((k) => `"${k}": "..."`).join(', ')} }
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'o4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText);
    throw new Error(`OpenAI error ${response.status}: ${err.slice(0, 200)}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI ha restituito una risposta vuota');

  let parsed: TranslationResult;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI ha restituito JSON non valido: ' + content.slice(0, 100));
  }

  // Merge: aggiungi campi mancanti come stringa vuota
  const result: TranslationResult = { en: {}, fr: {}, es: {}, de: {} };
  for (const lang of TARGET_LANGS) {
    for (const key of Object.keys(fields)) {
      result[lang][key] = parsed[lang]?.[key] ?? '';
    }
  }
  return result;
}
