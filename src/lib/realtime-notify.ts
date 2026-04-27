// Server-side notification for data changes
// Currently uses the existing Zustand triggerRefresh() pattern for real-time sync
// Socket.io integration can be enabled later when deploying to Vercel

// Notify all connected clients that data has changed
// Currently a no-op — real-time sync works via Zustand's triggerRefresh()
// which is already called by components after each data mutation
export function notifyDataChange(_collection: string, _action: 'create' | 'update' | 'delete', _id?: string) {
  // No-op for now — real-time sync via Zustand triggerRefresh pattern
  // Future: Add Socket.io or Firebase Realtime listeners here
}
