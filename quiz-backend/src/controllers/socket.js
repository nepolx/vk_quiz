import { Server } from 'socket.io';
import { getDb } from '../db/index.js';

let io = null;

/**
 * Инициализация Socket.IO сервера поверх HTTP сервера
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5000'],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Успешное подключение: ${socket.id}`);

    socket.on('join_room', async ({ sessionId, userNick }) => {
      if (!sessionId) return;
      
      const roomName = `room_${sessionId}`;
      socket.join(roomName);
      
      socket.sessionId = sessionId;
      socket.userNick = userNick;

      console.log(`[Socket.IO] Пользователь ${userNick || 'Аноним'} вошел в комнату сессии: ${roomName}`);

      await broadcastParticipants(sessionId);
    });

    socket.on('disconnect', async () => {
      console.log(`[Socket.IO] Клиент отключился: ${socket.id}`);
      if (socket.sessionId) {
        await broadcastParticipants(socket.sessionId);
      }
    });
  });

  return io;
}

export function getIo() {
  if (!io) {
    throw new Error("Socket.IO не инициализирован!");
  }
  return io;
}

/**
 * Рассылка актуального списка участников из базы данных всем клиентам в комнате
 */
export async function broadcastParticipants(sessionId) {
  try {
    const db = getDb();
    if (!db) return;
    
    const rows = await db.all(
      `SELECT sp.id, u.nick 
       FROM session_participants sp
       LEFT JOIN users u ON sp.user_id = u.id
       WHERE sp.session_id = ?`,
      [sessionId]
    );

    const participants = rows.map(row => ({
      id: row.id,
      nick: row.nick || `Игрок #${row.id}`
    }));

    if (io) {
      io.to(`room_${sessionId}`).emit('participants_update', participants);
    }
  } catch (err) {
    console.error(`[Socket.IO Error]`, err);
  }
}