let listeners = []

export function onSessionExpired(callback) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter((l) => l !== callback)
  }
}

export function emitSessionExpired() {
  listeners.forEach((callback) => callback())
}
