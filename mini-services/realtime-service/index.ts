import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

io.on('connection', (socket) => {
  console.log(`[Realtime] Client connected: ${socket.id}`)

  // User identifies themselves with their role and userId
  socket.on('identify', (data: { userId: string; role: string }) => {
    socket.join(`role:${data.role}`)
    socket.join(`user:${data.userId}`)
    console.log(`[Realtime] User identified: ${data.userId} (${data.role})`)
  })

  // Data change notifications from API routes (via Socket.io client)
  socket.on('data-changed', (data: {
    collection: string
    action: 'create' | 'update' | 'delete'
    id?: string
  }) => {
    console.log(`[Realtime] Data changed: ${data.collection} ${data.action}`)
    // Broadcast to ALL connected clients so they refresh
    io.emit('refresh-data', {
      collection: data.collection,
      action: data.action,
      id: data.id,
      timestamp: Date.now(),
    })
  })

  socket.on('disconnect', () => {
    console.log(`[Realtime] Client disconnected: ${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[Realtime] Socket.io server running on port ${PORT}`)
})
