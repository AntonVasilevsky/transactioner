/** Most recently opened players first; never opened ones after them, alphabetically. */
export const sortRecentPlayers = <T extends Pick<Player, 'messenger_username' | 'last_used_at'>>(players: T[]) => (
  [...players].sort((left, right) => {
    const usedDiff = (right.last_used_at || 0) - (left.last_used_at || 0)
    if (usedDiff !== 0) return usedDiff
    return left.messenger_username.localeCompare(right.messenger_username, undefined, { sensitivity: 'base' })
  })
)

/** Other contacts of the player, without the one already shown as the name. */
export const recentPlayerDescription = (player: Pick<Player, 'messenger_username' | 'contact_summary'>) => (
  String(player.contact_summary || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value && value !== player.messenger_username.trim())
    .join(' · ')
)
