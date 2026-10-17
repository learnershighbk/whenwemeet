import { useEffect, useRef } from 'react'

type Props = {
  open: boolean
  message: string
  confirmLabel: string
  busy?: boolean
  busyLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** In-page confirm (not window.confirm). Esc or clicking outside = Cancel. */
export default function ConfirmDialog({ open, message, confirmLabel, busy, busyLabel, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-ink/30"
    >
      <div className="p-5">
        <p className="mb-5">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary h-11 px-4 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            disabled={busy}
            className="btn-primary h-11 px-4 disabled:opacity-70"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
