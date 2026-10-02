import { useEffect, useState } from 'react'

/** Player account counts per room; the common source for sorting room lists. */
export function useRoomUsageStats() {
  const [stats, setStats] = useState<RoomRegistrationStat[]>([])

  useEffect(() => {
    let active = true
    window.electronAPI.getRoomRegistrationStats()
      .then((result) => {
        if (active) setStats(result || [])
      })
      .catch(() => {
        if (active) setStats([])
      })
    return () => {
      active = false
    }
  }, [])

  return stats
}
