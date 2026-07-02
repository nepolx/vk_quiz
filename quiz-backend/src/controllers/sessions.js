import { getDb } from '../db/index.js';
import { generateSessionCode } from '../utils/helpers.js';
import { getIo, broadcastParticipants } from './socket.js';

/**
 * POST /api/sessions/start
 * Создать новую сессию организатором
 */
export async function startSession(req, res) {
  try {
    const { quizId } = req.body;
    if (!quizId) return res.status(400).json({ message: 'quizId обязателен' });

    const db = getDb();
    const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [quizId]);
    if (!quiz) return res.status(404).json({ message: 'Квиз не найден' });

    let code;
    let exists = true;
    while (exists) {
      code = generateSessionCode();
      const session = await db.get('SELECT id FROM sessions WHERE code = ?', [code]);
      exists = !!session;
    }

    const result = await db.run(
      `INSERT INTO sessions (quiz_id, organizer_id, code, status)
       VALUES (?, ?, ?, 'waiting')`,
      [quizId, req.user.id, code]
    );

    await db.run('UPDATE quizzes SET status = "completed" WHERE id = ?', [quizId]);

    res.status(201).json({
      id: result.lastID,
      code,
      quizId,
      status: 'waiting'
    });
  } catch (err) {
    console.error('startSession error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/sessions/join
 * Вход участника по ПИН-коду
 */
export async function joinSession(req, res) {
  try {
    const { code, nick } = req.body;
    const clientNick = nick || `Игрок_${Math.floor(1000 + Math.random() * 9000)}`;

    if (!code) return res.status(400).json({ message: 'Код комнаты обязателен' });

    const db = getDb();
    const session = await db.get('SELECT * FROM sessions WHERE code = ? AND status = "waiting"', [code]);
    if (!session) return res.status(404).json({ message: 'Активная комната с таким кодом не найдена' });

    const currentCount = await db.get(
      'SELECT COUNT(*) as count FROM session_participants WHERE session_id = ?',
      [session.id]
    );

    const quiz = await db.get('SELECT max_participants FROM quizzes WHERE id = ?', [session.quiz_id]);
    const limit = quiz.max_participants || 30;
    if (currentCount.count >= limit) {
      return res.status(400).json({ 
        message: 'Лимит участников этой игры достигнут. Вы не можете подключиться.' 
      });
    }

    const userId = req.user ? req.user.id : null;

    const result = await db.run(
      'INSERT INTO session_participants (session_id, user_id, nick) VALUES (?, ?, ?)',
      [session.id, userId, clientNick]
    );

    const participantId = result.lastID;

    setImmediate(async () => {
      await broadcastParticipants(session.id);
    });

    res.json({
      sessionId: session.id,
      quizId: session.quiz_id,
      participantId,
      code: session.code,
      participantNick: clientNick
    });
  } catch (err) {
    console.error('joinSession error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/sessions/:sessionId/start-quiz
 * Запуск квиза организатором
 */
export async function startQuiz(req, res) {
  try {
    const { sessionId } = req.params;
    const db = getDb();

    const session = await db.get('SELECT * FROM sessions WHERE id = ? AND organizer_id = ?', [sessionId, req.user.id]);
    if (!session) return res.status(404).json({ message: 'Сессия не найдена или у вас нет прав' });

    await db.run("UPDATE sessions SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?", [sessionId]);

    const quiz = await db.get('SELECT time_per_question FROM quizzes WHERE id = ?', [session.quiz_id]);

    const questions = await db.all(
      'SELECT id, type, text, image_url as imageUrl FROM questions WHERE quiz_id = ? ORDER BY question_order ASC',
      [session.quiz_id]
    );

    for (let q of questions) {
      q.options = await db.all(
        'SELECT id, text FROM answers WHERE question_id = ? ORDER BY answer_order ASC',
        [q.id]
      );
    }

    const io = getIo();
    io.to(`room_${sessionId}`).emit('start_quiz', {
      timePerQuestion: quiz?.time_per_question || 30,
      questions: questions
    });

    res.json({ message: 'Квиз успешно запущен по WebSocket' });
  } catch (err) {
    console.error('startQuiz error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/sessions/:sessionId/answer
 * Отправить ответ участника
 */
export async function submitAnswer(req, res) {
  try {
    const { sessionId } = req.params;
    const { participantId, questionId, answerId } = req.body;

    if (!participantId || !questionId || !answerId) {
      return res.status(400).json({ message: 'Все поля обязательны' });
    }

    const db = getDb();

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    const participant = await db.get(
      'SELECT nick FROM session_participants WHERE id = ? AND session_id = ?',
      [participantId, sessionId]
    );

    await db.run(
      `INSERT INTO user_answers (session_id, participant_id, question_id, answer_id)
       VALUES (?, ?, ?, ?)`,
      [sessionId, participantId, questionId, answerId]
    );

    const answer = await db.get('SELECT is_correct FROM answers WHERE id = ?', [answerId]);
    const isCorrect = answer ? answer.is_correct === 1 : false;

    const io = getIo();
    io.to(`room_${sessionId}`).emit('player_answered', {
      participantId,
      nick: participant?.nick || `Игрок #${participantId}`,
      questionId: Number(questionId),
      answerId: Number(answerId),
      isCorrect
    });

    res.json({ message: 'Ответ сохранен' });
  } catch (err) {
    console.error('SubmitAnswer error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/sessions/:sessionId/next
 * Перейти к следующему вопросу (управляется организатором)
 */
export async function nextQuestion(req, res) {
  try {
    const { sessionId } = req.params;
    const db = getDb();

    const session = await db.get('SELECT * FROM sessions WHERE id = ? AND organizer_id = ?', [
      sessionId,
      req.user.id,
    ]);

    if (!session) {
      return res.status(404).json({ message: 'Сессия не найдена' });
    }

    const nextIdx = session.current_question_index + 1;

    const question = await db.get(
      `SELECT q.* FROM questions q
       WHERE q.quiz_id = ?
       ORDER BY q.question_order
       LIMIT 1 OFFSET ?`,
      [session.quiz_id, nextIdx]
    );

    const io = getIo();

    if (!question) {
      await db.run(
        `UPDATE sessions SET status = 'completed', ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [sessionId]
      );

      io.to(`room_${sessionId}`).emit('quiz_finished');

      return res.json({
        message: 'Квиз завершен',
        nextQuestion: null,
        isLastQuestion: true,
      });
    }

    await db.run(
      `UPDATE sessions SET current_question_index = ? WHERE id = ?`,
      [nextIdx, sessionId]
    );

    io.to(`room_${sessionId}`).emit('next_question_triggered', { questionIndex: nextIdx });

    res.json({
      nextQuestion: question,
      questionIndex: nextIdx,
    });
  } catch (err) {
    console.error('NextQuestion error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

// ---------------------------------------------------------------------------
// Вспомогательная функция: рассчитать очки за сессию для одного участника.
// Формула: 100 базовых очков за каждый правильный ответ +
//          бонус за скорость (место среди ответивших правильно):
//          1-й = +50, 2-й = +40, 3-й = +30, все остальные = +20.
// ---------------------------------------------------------------------------
const SPEED_BONUS = [50, 40, 30, 20];

async function calcScore(db, sessionId, participantId) {
  // Получаем все правильные ответы участника с их question_id
  const correctAnswers = await db.all(
    `SELECT ua.question_id FROM user_answers ua
     JOIN answers a ON ua.answer_id = a.id
     WHERE ua.session_id = ? AND ua.participant_id = ? AND a.is_correct = 1`,
    [sessionId, participantId]
  );

  let score = 0;
  for (const { question_id } of correctAnswers) {
    // Ранг: на каком месте среди правильно ответивших оказался участник
    // (сортируем по answered_at — кто раньше, тот выше)
    const rank = await db.get(
      `SELECT COUNT(*) + 1 as rank FROM user_answers ua
       JOIN answers a ON ua.answer_id = a.id
       WHERE ua.session_id = ?
         AND ua.question_id = ?
         AND a.is_correct = 1
         AND ua.answered_at < (
           SELECT answered_at FROM user_answers
           WHERE session_id = ? AND participant_id = ? AND question_id = ?
           LIMIT 1
         )`,
      [sessionId, question_id, sessionId, participantId, question_id]
    );
    const r = (rank?.rank ?? 1) - 1; // 0-based index for SPEED_BONUS
    score += 100 + SPEED_BONUS[Math.min(r, SPEED_BONUS.length - 1)];
  }

  return score;
}

/**
 * GET /api/sessions/:sessionId/results
 * Получить результаты квиза — одинаковый ответ для организатора и участников
 */
export async function getResults(req, res) {
  try {
    const { sessionId } = req.params;
    const db = getDb();

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [sessionId]);
    if (!session) return res.status(404).json({ message: 'Сессия не найдена' });

    const isOrganizer = req.user && req.user.id === session.organizer_id;

    //const quiz = await db.get('SELECT user_id FROM quizzes WHERE id = ?', [session.quiz_id]);
    
    if (session.status !== 'completed') {
      await db.run('UPDATE sessions SET status = "completed" WHERE id = ?', [sessionId]);
      console.log(`[БЭКЕНД] Сессия ${sessionId} успешно завершена и переведена в статус completed`);
    }

    const participants = await db.all(
      'SELECT * FROM session_participants WHERE session_id = ? ORDER BY joined_at',
      [sessionId]
    );

    const results = [];
    for (const p of participants) {
      const score = await calcScore(db, sessionId, p.id);

      const correct = await db.get(
        `SELECT COUNT(*) as count FROM user_answers ua
         JOIN answers a ON ua.answer_id = a.id
         WHERE ua.session_id = ? AND ua.participant_id = ? AND a.is_correct = 1`,
        [sessionId, p.id]
      );
      const total = await db.get(
        'SELECT COUNT(*) as count FROM user_answers WHERE session_id = ? AND participant_id = ?',
        [sessionId, p.id]
      );

      const accuracy = total.count > 0 ? Math.round((correct.count / total.count) * 100) : 0;

      results.push({
        rank: 0,
        initials: p.nick.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
        name: p.nick,
        pts: score,
        accuracy,
      });
    }

    const sorted = results
      .sort((a, b) => b.pts - a.pts)
      .map((item, i) => ({ ...item, rank: i + 1 }));

    res.json(sorted);
  } catch (err) {
    console.error('GetResults error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * GET /api/sessions/:sessionId/participants
 */
export async function getParticipants(req, res) {
  try {
    const { sessionId } = req.params;
    const db = getDb();

    const participants = await db.all(
      'SELECT id, nick, joined_at FROM session_participants WHERE session_id = ? ORDER BY joined_at DESC',
      [sessionId]
    );

    return res.json(participants);
  } catch (err) {
    console.error('GetParticipants error:', err);
    return res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * GET /api/sessions/history
 * История участий с реальными очками, местом и точностью
 */
export async function getHistory(req, res) {
  try {
    const db = getDb();

    // Получаем все сессии, где участвовал пользователь, с participant_id
    const participations = await db.all(
      `SELECT
          sp.id         AS participant_id,
          s.id         AS session_id,
          q.id         AS quiz_id,
          q.name       AS title,
          DATE(s.created_at) AS date
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       JOIN quizzes  q ON s.quiz_id     = q.id
       WHERE sp.user_id = ? 
         AND s.status = 'completed'
         -- ПРОВЕРКА: у участника должен быть ответ на последний вопрос этого квиза
         AND EXISTS (
           SELECT 1 FROM user_answers ua
           WHERE ua.session_id = s.id 
             AND ua.participant_id = sp.id
             AND ua.question_id = (
               SELECT id FROM questions WHERE quiz_id = q.id ORDER BY id DESC LIMIT 1
             )
         )
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );

    const formatted = [];

    for (const h of participations) {
      const allParticipants = await db.all(
        'SELECT id FROM session_participants WHERE session_id = ?',
        [h.session_id]
      );

      const allScores = await Promise.all(
        allParticipants.map(p => calcScore(db, h.session_id, p.id))
      );
      const myScore = await calcScore(db, h.session_id, h.participant_id);

      // Место = количество участников с большим счётом + 1
      const myPlace = allScores.filter(s => s > myScore).length + 1;

      // Точность за эту сессию
      const correct = await db.get(
        `SELECT COUNT(*) as count FROM user_answers ua
         JOIN answers a ON ua.answer_id = a.id
         WHERE ua.session_id = ? AND ua.participant_id = ? AND a.is_correct = 1`,
        [h.session_id, h.participant_id]
      );
      const total = await db.get(
        'SELECT COUNT(*) as count FROM user_answers WHERE session_id = ? AND participant_id = ?',
        [h.session_id, h.participant_id]
      );
      const accuracy = total.count > 0 ? Math.round((correct.count / total.count) * 100) : 0;

      formatted.push({
        id: h.quiz_id,
        sessionId: h.session_id,
        emoji: '📝',
        title: h.title,
        date: formatDate(h.date || new Date()),
        place: myPlace,
        total: allParticipants.length,
        pts: myScore,
        accuracy,
      });
    }

    res.json({ history: formatted });
  } catch (err) {
    console.error('GetHistory error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/**
 * GET /api/users/stats
 * Реальная статистика участника
 */
export async function getStats(req, res) {
  try {
    const db = getDb();

    const participations = await db.all(
      `SELECT sp.id AS participant_id, sp.session_id
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       JOIN quizzes q ON s.quiz_id = q.id
       WHERE sp.user_id = ? 
         AND s.status = 'completed'
         AND EXISTS (
           SELECT 1 FROM user_answers ua
           WHERE ua.session_id = s.id 
             AND ua.participant_id = sp.id
             AND ua.question_id = (
               SELECT id FROM questions WHERE quiz_id = q.id ORDER BY id DESC LIMIT 1
             )
         )`,
      [req.user.id]
    );

    let totalCorrect = 0;
    let totalAnswered = 0;
    let wins = 0;

    for (const p of participations) {
      const correct = await db.get(
        `SELECT COUNT(*) as count FROM user_answers ua
         JOIN answers a ON ua.answer_id = a.id
         WHERE ua.session_id = ? AND ua.participant_id = ? AND a.is_correct = 1`,
        [p.session_id, p.participant_id]
      );
      const total = await db.get(
        'SELECT COUNT(*) as count FROM user_answers WHERE session_id = ? AND participant_id = ?',
        [p.session_id, p.participant_id]
      );
      totalCorrect  += correct.count;
      totalAnswered += total.count;

      // Победа = 1-е место в сессии
      const myScore = await calcScore(db, p.session_id, p.participant_id);
      const allParticipants = await db.all(
        'SELECT id FROM session_participants WHERE session_id = ?',
        [p.session_id]
      );
      const allScores = await Promise.all(
        allParticipants.map(ap => calcScore(db, p.session_id, ap.id))
      );
      const myPlace = allScores.filter(s => s > myScore).length + 1;
      if (myPlace === 1) wins++;
    }

    const avgAccuracy = totalAnswered > 0
      ? Math.round((totalCorrect / totalAnswered) * 100)
      : 0;

    res.json({
      totalQuizzes: participations.length,
      wins,
      avgAccuracy,
    });
  } catch (err) {
    console.error('GetStats error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}


/**
 * GET /api/users/organizer-stats
 * Статистика для панели организатора
 */
export async function getOrganizerStats(req, res) {
  try {
    const db = getDb();
    const organizerId = req.user.id;

    const mySessions = await db.all('SELECT id, status FROM sessions WHERE organizer_id = ?', [organizerId]);

    let totalParticipants = 0;
    let completedCount = 0;

    const quizzesCountResult = await db.get(
      'SELECT COUNT(*) as count FROM quizzes WHERE organizer_id = ?',
      [organizerId]
    );
    const totalQuizzes = quizzesCountResult?.count || 0;

    for (const s of mySessions) {
      if (s.status === 'completed') {
        completedCount++;
      }

      const participantsCount = await db.get(
        'SELECT COUNT(*) as count FROM session_participants WHERE session_id = ?',
        [s.id]
      );
      totalParticipants += (participantsCount?.count || 0);
    }

    res.json({
      totalQuizzes,
      totalParticipants,
      completedCount
    });
  } catch (err) {
    console.error('getOrganizerStats error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}


/**
 * GET /api/sessions/quiz/:quizId/completed
 * Получить список всех завершенных сессий для конкретного квиза
 */
export async function getQuizSessionHistory(req, res) {
  try {
    const { quizId } = req.params;
    const db = getDb();
    
    const sessionsList = await db.all(
      `SELECT id, created_at FROM sessions 
       WHERE quiz_id = ? AND status = 'completed' 
       ORDER BY created_at DESC`,
      [quizId]
    );
    
    res.json(sessionsList);
  } catch (err) {
    console.error('getQuizSessionHistory error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}