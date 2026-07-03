import { getDb } from '../db/index.js';

/**
 * GET /api/quizzes
 * Получить все квизы организатора (требует токена)
 */
export async function getQuizzes(req, res) {
  try {
    const db = getDb();
    const quizzes = await db.all(
      'SELECT * FROM quizzes WHERE organizer_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );

    for (const quiz of quizzes) {
      try {
        quiz.categories = quiz.description ? JSON.parse(quiz.description) : [];
      } catch (e) {
        quiz.categories = [];
      }

      const qCount = await db.get(
        'SELECT COUNT(*) as count FROM questions WHERE quiz_id = ?',
        [quiz.id]
      );
      quiz.questionsCount = qCount.count;
    }

    res.json(quizzes);
  } catch (err) {
    console.error('GetQuizzes error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * GET /api/quizzes/:id
 * Получить конкретный квиз с вопросами и ответами
 */
export async function getQuiz(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const quiz = await db.get('SELECT * FROM quizzes WHERE id = ?', [id]);
    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    try {
      quiz.categories = quiz.description ? JSON.parse(quiz.description) : [];
    } catch (e) {
      quiz.categories = [];
    }

    const rawQuestions = await db.all(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY question_order',
      [id]
    );

    const mappedQuestions = [];
    for (const q of rawQuestions) {
      const answers = await db.all(
        `SELECT id, text, is_correct, answer_order, image_url
         FROM answers WHERE question_id = ? ORDER BY answer_order`,
        [q.id]
      );

      mappedQuestions.push({
        id:       q.id,
        type:     q.type,
        text:     q.text,
        imageUrl: q.image_url || '',   
        order:    q.question_order,
        options:  answers.map(a => ({
          id:        a.id,
          text:      a.text,
          imageUrl:  a.image_url || '',  
          isCorrect: !!a.is_correct,
        })),
      });
    }

    res.json({
      ...quiz,
      questions: mappedQuestions,
    });
  } catch (err) {
    console.error('GetQuiz error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/quizzes
 * Создать новый квиз (требует токена)
 * Body: { name, timePerQuestion, maxParticipants, description? }
 */
export async function createQuiz(req, res) {
  try {
    const { name, timePerQuestion, maxParticipants, description } = req.body;

    if (!name || !timePerQuestion) {
      return res.status(400).json({ message: 'Название и время обязательны' });
    }

    if (timePerQuestion < 5 || timePerQuestion > 300) {
      return res.status(400).json({ message: 'Время должно быть от 5 до 300 секунд' });
    }

    const db = getDb();

    const dbDescription = Array.isArray(description) ? JSON.stringify(description) : '[]';

    const result = await db.run(
      `INSERT INTO quizzes (organizer_id, name, time_per_question, max_participants, description, status)
       VALUES (?, ?, ?, ?, ?, 'draft')`,
      [req.user.id, name, timePerQuestion, maxParticipants || 30, dbDescription || '']
    );

    res.status(201).json({
      id: result.lastID,
      name,
      timePerQuestion,
      maxParticipants: maxParticipants || 30,
      categories: description || [],
      status: 'draft',
    });
  } catch (err) {
    console.error('CreateQuiz error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * PUT /api/quizzes/:id
 * Обновить квиз 
 */
export async function updateQuiz(req, res) {
  try {
    const { id } = req.params;
    const { name, timePerQuestion, maxParticipants, description } = req.body;

    const db = getDb();

    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?',
      [id, req.user.id]
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    if (quiz.status !== 'draft') {
      return res.status(400).json({ message: 'Можно редактировать только черновики' });
    }

    const dbDescription = Array.isArray(description) ? JSON.stringify(description) : quiz.description;

    await db.run(
      `UPDATE quizzes SET name = ?, time_per_question = ?, max_participants = ?, 
                         description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || quiz.name, 
        timePerQuestion || quiz.time_per_question, 
        maxParticipants || quiz.max_participants, 
        dbDescription, 
        id
      ]
    );

    res.json({ message: 'Квиз обновлен' });
  } catch (err) {
    console.error('UpdateQuiz error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * DELETE /api/quizzes/:id
 */
export async function deleteQuiz(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?',
      [id, req.user.id]
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    await db.run('DELETE FROM quizzes WHERE id = ?', [id]);

    res.json({ message: 'Квиз удален' });
  } catch (err) {
    console.error('DeleteQuiz error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}