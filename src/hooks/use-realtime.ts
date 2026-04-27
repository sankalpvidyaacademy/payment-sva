'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAppStore } from '@/lib/store'

// Custom hook for real-time data sync via Socket.io
export function useRealtimeSync() {
  const socketRef = useRef<Socket | null>(null)
  const { user, triggerRefresh } = useAppStore()

  useEffect(() => {
    if (!user) return

    // Connect to Socket.io server through the gateway
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      console.log('[Realtime] Connected')
      // Identify this user to the server
      socket.emit('identify', { userId: user.id, role: user.role })
    })

    socket.on('refresh-data', (data: {
      collection: string
      action: 'create' | 'update' | 'delete'
      id?: string
      timestamp: number
    }) => {
      console.log(`[Realtime] Data changed: ${data.collection} ${data.action}`)
      // Trigger a global refresh so all components refetch their data
      triggerRefresh()
    })

    socket.on('disconnect', () => {
      console.log('[Realtime] Disconnected')
    })

    socket.on('connect_error', (err: Error) => {
      console.warn('[Realtime] Connection error:', err.message)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [user, triggerRefresh])

  return socketRef
}
