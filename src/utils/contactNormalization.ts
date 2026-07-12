const invisibleContactChars = /[\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g
const unicodeSpaces = /[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g
const unicodeDashes = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g

export const normalizeContactText = (value: string) => String(value || '')
  .normalize('NFKC')
  .replace(invisibleContactChars, '')
  .replace(unicodeSpaces, ' ')
  .replace(unicodeDashes, '-')
  .replace(/[ \t]+/g, ' ')
  .trim()

export const contactSearchKey = (value: string) => normalizeContactText(value).toLowerCase()

export const inferContactMethod = (value: string): ContactMethod => {
  const normalized = normalizeContactText(value)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return 'Email'

  const digits = normalized.replace(/\D/g, '')
  if (/^\+?[\d\s().-]+$/.test(normalized) && digits.length >= 7) return 'WA'

  return 'TG'
}
