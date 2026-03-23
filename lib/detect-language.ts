/**
 * Simple client-side language detection from ad body text.
 * Uses Unicode ranges + common word patterns. Fast enough for 200-300 ads.
 */

export type AdLanguage = "en" | "vi" | "fr" | "es" | "de" | "pt" | "zh" | "ko" | "ja" | "ar" | "ru" | "other";

export const LANGUAGE_OPTIONS: Array<{ id: AdLanguage | "all"; label: string; flag: string }> = [
  { id: "all", label: "All",        flag: "🌐" },
  { id: "en",  label: "English",    flag: "🇺🇸" },
  { id: "vi",  label: "Tiếng Việt", flag: "🇻🇳" },
  { id: "fr",  label: "Français",   flag: "🇫🇷" },
  { id: "es",  label: "Español",    flag: "🇪🇸" },
  { id: "de",  label: "Deutsch",    flag: "🇩🇪" },
  { id: "pt",  label: "Português",  flag: "🇧🇷" },
  { id: "zh",  label: "中文",        flag: "🇨🇳" },
  { id: "ko",  label: "한국어",      flag: "🇰🇷" },
  { id: "ja",  label: "日本語",      flag: "🇯🇵" },
  { id: "ar",  label: "العربية",     flag: "🇸🇦" },
  { id: "ru",  label: "Русский",    flag: "🇷🇺" },
];

// Vietnamese-specific diacritical characters (very distinctive)
const VI_CHARS = /[ăắằẳẵặâấầẩẫậđêếềểễệôốồổỗộơớờởỡợưứừửữự]/i;
const VI_WORDS = /\b(của|và|những|được|trong|một|không|có|cho|này|với|các|từ|đã|người|theo|về|tại|khi|là|để|đến|mình|bạn|giá|sản phẩm|miễn phí)\b/i;

// French
const FR_WORDS = /\b(les|des|une|est|sont|avec|pour|dans|qui|que|sur|pas|nous|vous|votre|notre|cette|sont|aux|leur|mais|aussi|très|chez|tout|comme)\b/i;

// Spanish
const ES_WORDS = /\b(los|las|una|uno|con|para|por|como|pero|más|todo|esta|esto|ese|son|han|tiene|sobre|puede|cada|entre|desde|hasta|mejor|nuestro|tu)\b/i;

// German
const DE_WORDS = /\b(der|die|das|ein|eine|ist|und|mit|für|von|nicht|auf|den|dem|sich|wird|sind|haben|auch|nach|noch|oder|aus|bei|nur|über|dann|mehr|dein|ihr)\b/i;

// Portuguese
const PT_WORDS = /\b(uma|como|para|com|não|são|mais|você|seu|sua|nos|pela|pelo|dos|das|tem|pode|este|essa|aqui|agora|também|muito|nosso|nossa)\b/i;

// CJK ranges
const CJK = /[\u3000-\u9FFF\uF900-\uFAFF]/;
const KOREAN = /[\uAC00-\uD7AF\u1100-\u11FF]/;
const JAPANESE = /[\u3040-\u309F\u30A0-\u30FF]/; // hiragana + katakana
const ARABIC = /[\u0600-\u06FF\u0750-\u077F]/;
const CYRILLIC = /[\u0400-\u04FF]/;

const cache = new Map<string, AdLanguage>();

export function detectLanguage(text: string | undefined): AdLanguage {
  if (!text || text.length < 10) return "en";

  // Use first 200 chars for speed, cache by truncated key
  const sample = text.slice(0, 200);
  const cacheKey = sample.slice(0, 60);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let result: AdLanguage = "en";

  // 1. Script-based detection (very reliable)
  if (VI_CHARS.test(sample)) result = "vi";
  else if (KOREAN.test(sample)) result = "ko";
  else if (JAPANESE.test(sample)) result = "ja";
  else if (CJK.test(sample)) result = "zh";
  else if (ARABIC.test(sample)) result = "ar";
  else if (CYRILLIC.test(sample)) result = "ru";
  // 2. Word-based detection (Latin scripts)
  else {
    const wordMatches = [
      { lang: "vi" as const, score: (sample.match(VI_WORDS) || []).length },
      { lang: "fr" as const, score: (sample.match(FR_WORDS) || []).length },
      { lang: "es" as const, score: (sample.match(ES_WORDS) || []).length },
      { lang: "de" as const, score: (sample.match(DE_WORDS) || []).length },
      { lang: "pt" as const, score: (sample.match(PT_WORDS) || []).length },
    ].filter(m => m.score > 0);

    if (wordMatches.length > 0) {
      wordMatches.sort((a, b) => b.score - a.score);
      result = wordMatches[0].lang;
    }
  }

  cache.set(cacheKey, result);
  return result;
}

export function getLanguageFlag(lang: AdLanguage): string {
  return LANGUAGE_OPTIONS.find(l => l.id === lang)?.flag ?? "🌐";
}
