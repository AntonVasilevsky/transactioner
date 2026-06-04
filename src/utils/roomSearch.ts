const cyrillicToLatin: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya'
}

export const normalizeRoomSearchValue = (value: string) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/ё/g, 'е')
  .replace(/[^a-z0-9а-я]+/g, '')

const roomAliasGroups = [
  ['nexa', 'nexapoker', 'некса', 'некса покер'],
  ['championpoker', 'champion', 'чемпион', 'чемпион покер'],
  ['redstar', 'red star', 'редстар', 'ред стар'],
  ['wptg', 'wptglobal', 'wpt global', 'впт', 'вптг', 'впт глобал'],
  ['888', '888poker', '888 poker', '888 покер', 'три восьмерки'],
  ['acr', 'americascardroom', 'americas cardroom', 'акр', 'америкас кардрум'],
  ['blackchippoker', 'black chip poker', 'bcp', 'блек чип', 'блэк чип', 'бсп'],
  ['basepoker', 'base poker', 'бейс покер'],
  ['bcpoker', 'bc poker', 'бс покер', 'бц покер'],
  ['bet365', 'бет365', 'бет 365'],
  ['betonline', 'bet online', 'бетонлайн', 'бет онлайн'],
  ['bwin', 'бвин'],
  ['coinpoker', 'coin poker', 'коин покер'],
  ['grompoker', 'grom poker', 'гром покер'],
  ['gutspoker', 'guts poker', 'гатс покер', 'гутс покер'],
  ['ignition', 'игнишн'],
  ['partypoker', 'party poker', 'пати покер', 'парти покер'],
  ['pokerking', 'poker king', 'покер кинг'],
  ['rptbet', 'rptbetpoker', 'rptbet poker', 'рптбет', 'рпт бет', 'рптбет покер'],
  ['shenpoker', 'shen poker', 'шен покер'],
  ['sportsbetting', 'sports betting', 'спортсбеттинг', 'спортс беттинг'],
  ['stakepoker', 'stake poker', 'стейк покер'],
  ['tigergaming', 'tiger gaming', 'тайгер', 'тайгер гейминг', 'тигер'],
  ['tonpoker', 'ton poker', 'тон', 'тон покер'],
  ['uppoker', 'up poker', 'юп покер', 'ап покер', 'аппокер', 'уп покер'],
  ['vangpoker', 'vang poker', 'ванг покер'],
  ['vbet', 'vbetpoker', 'vbet poker', 'vbetlatam', 'vbet latam', 'вбет', 'ви бет', 'вбет покер'],
  ['yapoker', 'ya poker', 'япокер', 'я покер'],
  ['1win', '1 win', 'ванвин', 'ван вин', '1 вин']
]

const normalizedRoomAliasGroups = roomAliasGroups.map((group) => group.map((value) => normalizeRoomSearchValue(value)))

const transliterateCyrillicToLatin = (value: string) => Array.from(value)
  .map((char) => cyrillicToLatin[char] ?? char)
  .join('')

const searchVariants = (value: string) => {
  const normalized = normalizeRoomSearchValue(value)
  if (!normalized) return []
  const transliterated = transliterateCyrillicToLatin(normalized)
  return Array.from(new Set([normalized, transliterated].filter(Boolean)))
}

const roomSearchValues = (values: string[]) => {
  const baseValues = values.flatMap(searchVariants)
  const aliases = normalizedRoomAliasGroups.flatMap((group) => (
    baseValues.some((value) => group.some((alias) => alias.includes(value) || value.includes(alias)))
      ? group
      : []
  ))
  return Array.from(new Set([...baseValues, ...aliases]))
}

export const matchesRoomSearch = (values: Array<string | null | undefined>, query: string) => {
  const queryValues = searchVariants(query)
  if (!queryValues.length) return true

  const searchableValues = roomSearchValues(values.map((value) => String(value || '')))
  return queryValues.some((queryValue) => (
    searchableValues.some((value) => value.includes(queryValue))
  ))
}
