import { Check, Copy, Pencil } from 'lucide-react'

/**
 * Shared icon buttons (owner, 2026-10-08: copy / edit look the same everywhere). The style is the
 * copy button of "Инфо по румам"; new screens use these instead of their own buttons.
 */
const iconButtonClass = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/55 text-slate-300 transition-colors hover:bg-blue-600/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800/55 disabled:hover:text-slate-300'

export function IconCopyButton({ copied, onClick, label, disabled = false }: { copied: boolean, onClick: () => void, label: string, disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} disabled={disabled} className={iconButtonClass}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
  )
}

export function IconEditButton({ onClick, label = 'Редактировать' }: { onClick: () => void, label?: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={iconButtonClass}>
      <Pencil size={15} />
    </button>
  )
}
