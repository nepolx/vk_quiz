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

    // Событие: Вход в комнату ожидания квиза
    socket.on('join_room', async ({ sessionId, userNick }) => {
      if (!sessionId) return;
      
      const roomName = `room_${sessionId}`;
      socket.join(roomName);
      
      // Сохраняем метаданные прямо в объекте сокета
      socket.sessionId = sessionId;
      socket.userNick = userNick;

      console.log(`[Socket.IO] Пользователь ${userNick || 'Аноним'} вошел в комнату сессии: ${roomName}`);

      // Вызываем обновление списка участников для всех в комнате
      await broadcastParticipants(sessionId);
    });

    // Событие: Отключение клиента (закрытие вкладки, дисконнект)
    socket.on('disconnect', async () => {
      console.log(`[Socket.IO] Клиент отключился: ${socket.id}`);
      if (socket.sessionId) {
        await broadcastParticipants(socket.sessionId);
      }
    });
  });

  return io;
}

/**
 * Геттер текущего инстанса io для использования в контроллерах Express
 */
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
    
    // Запрос полностью аналогичен getParticipants, берем только существующие поля
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