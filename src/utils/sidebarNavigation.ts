export const defaultSidebarNavOrder = [
  'search',
  'list',
  'add',
  'roomInfo',
  'linkVerification',
] as const

export type SidebarNavId = typeof defaultSidebarNavOrder[number]

const sidebarNavIds = new Set<string>(defaultSidebarNavOrder)

export const normalizeSidebarNavOrder = (savedOrder: unknown): SidebarNavId[] => {
  const normalized: SidebarNavId[] = []

  if (Array.isArray(savedOrder)) {
    savedOrder.forEach((item) => {
      if (typeof item !== 'string' || !sidebarNavIds.has(item)) return
      const navId = item as SidebarNavId
      if (!normalized.includes(navId)) normalized.push(navId)
    })
  }

  defaultSidebarNavOrder.forEach((navId) => {
    if (!normalized.includes(navId)) normalized.push(navId)
  })

  return normalized
}

export const moveSidebarNavToTarget = (
  order: SidebarNavId[],
  draggedId: SidebarNavId,
  targetId: SidebarNavId,
): SidebarNavId[] => {
  if (draggedId === targetId || !order.includes(draggedId) || !order.includes(targetId)) return order

  const targetIndex = order.indexOf(targetId)
  const reordered = [...order]
  reordered.splice(order.indexOf(draggedId), 1)
  reordered.splice(targetIndex, 0, draggedId)
  return reordered
}
