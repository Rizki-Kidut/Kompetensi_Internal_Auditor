import { ref } from 'vue'

const toasts = ref([])
let _id = 0

export function useToast() {
  function show(message, type = 'info', duration = 3000) {
    const id = ++_id
    toasts.value.push({ id, message, type, duration })
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }
    return id
  }

  function remove(id) {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  const success = (msg, d) => show(msg, 'success', d)
  const error   = (msg, d) => show(msg, 'error',   d)
  const info    = (msg, d) => show(msg, 'info',    d)

  return { toasts, show, remove, success, error, info }
}
