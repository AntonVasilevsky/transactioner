import { LINK_VERIFICATION_USERNAME_FIELD_LABEL } from './linkVerificationFormatting'

/**
 * Link verification checks already sent (T-0028). Each copied request is logged with the room and
 * the Nick / Room ID / Email it carried; a new request warns when the same room was already checked
 * for one of them. The player contact is kept for later but is not part of the rule: one player
 * may write from different messengers.
 */
export interface LinkVerificationCheckFields {
  room_name: string
  nick: string
  room_id: string
  email: string
}

export interface LinkVerificationCheckInput extends LinkVerificationCheckFields {
  messenger?: string
  contact_value?: string
}

export interface LinkVerificationCheckRecord extends LinkVerificationCheckFields {
  created_at: string
}

export type LinkVerificationCheckField = 'nick' | 'room_id' | 'email'

export interface PreviousLinkVerificationChecks {
  count: number
  fields: LinkVerificationCheckField[]
}

const checkFields: LinkVerificationCheckField[] = ['nick', 'room_id', 'email']

const fieldLabels: Record<LinkVerificationCheckField, string> = {
  nick: LINK_VERIFICATION_USERNAME_FIELD_LABEL,
  room_id: 'Room ID',
  email: 'Email',
}

/** Copying the same request again within this time is the same sending, not a repeat check. */
export const LINK_VERIFICATION_REPEAT_COPY_MS = 30 * 60 * 1000

const key = (value: string | null | undefined) => String(value || '').trim().toLowerCase()

export const hasLinkVerificationIdentity = (check: LinkVerificationCheckFields) =>
  Boolean(key(check.room_name)) && checkFields.some((field) => key(check[field]))

/** The one rule: same room and at least one filled Nick / Room ID / Email equal (case and edge spaces aside). */
export const matchedLinkVerificationFields = (record: LinkVerificationCheckFields, query: LinkVerificationCheckFields) => {
  if (!key(query.room_name) || key(record.room_name) !== key(query.room_name)) return []
  return checkFields.filter((field) => key(query[field]) && key(query[field]) === key(record[field]))
}

export const isSameLinkVerificationCheck = (a: LinkVerificationCheckFields, b: LinkVerificationCheckFields) =>
  key(a.room_name) === key(b.room_name) && checkFields.every((field) => key(a[field]) === key(b[field]))

export const isRecentSameLinkVerificationCheck = (record: LinkVerificationCheckRecord, query: LinkVerificationCheckFields, now: Date) =>
  isSameLinkVerificationCheck(record, query) && now.getTime() - Date.parse(record.created_at) < LINK_VERIFICATION_REPEAT_COPY_MS

/** Earlier checks of this binding; the operator's own copy of the same request in the last 30 minutes does not count. */
export const summarizePreviousLinkVerificationChecks = (
  records: LinkVerificationCheckRecord[],
  query: LinkVerificationCheckFields,
  now: Date,
): PreviousLinkVerificationChecks | null => {
  const matched = new Set<LinkVerificationCheckField>()
  let count = 0
  for (const record of records) {
    if (isRecentSameLinkVerificationCheck(record, query, now)) continue
    const fields = matchedLinkVerificationFields(record, query)
    if (!fields.length) continue
    count += 1
    fields.forEach((field) => matched.add(field))
  }
  return count ? { count, fields: checkFields.filter((field) => matched.has(field)) } : null
}

const timesText = (count: number) => {
  const lastTwo = count % 100
  const last = count % 10
  if (last === 1 && lastTwo !== 11) return `${count} раз`
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} раза`
  return `${count} раз`
}

export const describePreviousLinkVerificationChecks = (previous: PreviousLinkVerificationChecks, query: LinkVerificationCheckFields) =>
  `Эта привязка уже отправлялась на проверку: ${previous.fields.map((field) => `${fieldLabels[field]} ${query[field].trim()}`).join(', ')} — ${timesText(previous.count)}.`
