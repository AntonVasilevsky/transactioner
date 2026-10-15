/**
 * Where a drop-down list or calendar opens (T-0026). The panel is drawn over the whole window
 * (portal + position: fixed), so a neighbouring card can never cover it; this rule keeps it next
 * to its field: below by default, above when the list does not fit below and there is more room above.
 */
export const DROPDOWN_GAP = 8
export const DROPDOWN_EDGE = 8
export const DROPDOWN_MAX_HEIGHT = 288
const DROPDOWN_MIN_HEIGHT = 96

/** field = as wide as the field; atLeastField = the field or wider for long options; content = own width. */
export type DropdownWidth = 'field' | 'atLeastField' | 'content'

interface Rect { left: number, top: number, bottom: number, width: number }
interface Viewport { width: number, height: number }

export interface DropdownPlacement {
  left: number
  top?: number
  bottom?: number
  maxHeight: number
  maxWidth: number
  width?: number
  minWidth?: number
}

export const dropdownPlacement = (field: Rect, viewport: Viewport, width: DropdownWidth, contentHeight: number): DropdownPlacement => {
  const wanted = Math.min(contentHeight, DROPDOWN_MAX_HEIGHT)
  const roomBelow = viewport.height - field.bottom - DROPDOWN_GAP - DROPDOWN_EDGE
  const roomAbove = field.top - DROPDOWN_GAP - DROPDOWN_EDGE
  const openUp = roomBelow < wanted && roomAbove > roomBelow
  const room = openUp ? roomAbove : roomBelow
  const left = Math.max(DROPDOWN_EDGE, field.left)
  return {
    left,
    ...(openUp ? { bottom: viewport.height - field.top + DROPDOWN_GAP } : { top: field.bottom + DROPDOWN_GAP }),
    maxHeight: Math.max(DROPDOWN_MIN_HEIGHT, Math.min(DROPDOWN_MAX_HEIGHT, room)),
    maxWidth: viewport.width - left - DROPDOWN_EDGE,
    ...(width === 'field' ? { width: field.width } : width === 'atLeastField' ? { minWidth: field.width } : {}),
  }
}
