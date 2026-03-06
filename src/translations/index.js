import en from './en.js';
import sr from './sr.js';
import de from './de.js';
import ru from './ru.js';
import es from './es.js';

const messages = { en, sr, de, ru, es };

export const LOCALES = [
  { code: 'en', labelKey: 'languages.en' },
  { code: 'sr', labelKey: 'languages.sr' },
  { code: 'de', labelKey: 'languages.de' },
  { code: 'ru', labelKey: 'languages.ru' },
  { code: 'es', labelKey: 'languages.es' },
];

export const DEFAULT_LOCALE = 'en';

export function getMessages(locale) {
  return messages[locale] || messages[DEFAULT_LOCALE];
}

export default messages;
