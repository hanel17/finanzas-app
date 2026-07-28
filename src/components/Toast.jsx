import { useEffect, useState } from 'react'

let toastFn = null

export const showToast = (msg, type = 'success') => {
  if (toastFn) toastFn(msg, type)
}

export default function Toast() {
  const [toast, setToast] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    toastFn = (msg, type) => {
      setToast({ msg, type })
      setTimeout(() => setVisible(true), 10)
      setTimeout(() => setVisible(false), 2500)
      setTimeout(() => setToast(null), 3000)
    }
  }, [])

  if (!toast) return null

  return (
    <div className={`toast ${toast.type} ${visible ? 'show' : ''}`}>
      {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
    </div>
  )
}
