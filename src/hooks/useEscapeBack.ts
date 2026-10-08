import { useEffect, useRef } from 'react'
import { registerEscapeBack } from '../utils/escapeNavigation'

/** While `active`, Esc runs `onBack` instead of leaving the section (see utils/escapeNavigation). */
export const useEscapeBack = (onBack: () => void, active: boolean) => {
  const handler = useRef({ run: onBack })
  useEffect(() => {
    handler.current.run = onBack
  })
  useEffect(() => {
    if (!active) return
    return registerEscapeBack(handler.current)
  }, [active])
}
