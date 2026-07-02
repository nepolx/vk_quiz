import { getDb } from '../db/index.js';

/**
 * POST /api/quizzes/:quizId/questions
 * Добавить вопрос к квизу
 * Body: { type, text, imageUrl?, options: [{text, isCorrect}, ...] }
 */
export async function createQuestion(req, res) {
  try {
    const { quizId } = req.params;
    const { type, text, imageUrl, options } = req.body;

    if (!text || !options || options.length < 2) {
      return res.status(400).json({ message: 'Вопрос и минимум 2 варианта обязательны' });
    }

    if (!options.some(o => o.isCorrect)) {
      return res.status(400).json({ message: 'Укажите правильный ответ' });
    }

    const db = getDb();

    // Проверить, что квиз существует и принадлежит пользователю
    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?',
      [quizId, req.user.id]
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    // Получить порядок последнего вопроса
    const last = await db.get(
      'SELECT MAX(question_order) as max_order FROM questions WHERE quiz_id = ?',
      [quizId]
    );
    const questionOrder = (last.max_order || 0) + 1;

    // Создать вопрос
    const qResult = await db.run(
      `INSERT INTO questions (quiz_id, type, text, image_url, question_order)
       VALUES (?, ?, ?, ?, ?)`,
      [quizId, type || 'text', text, imageUrl || null, questionOrder]
    );

    const questionId = qResult.lastID;

    // Добавить варианты ответов
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      await db.run(
        `INSERT INTO answers (question_id, text, is_correct, answer_order)
         VALUES (?, ?, ?, ?)`,
        [questionId, opt.text, opt.isCorrect ? 1 : 0, i]
      );
    }

    res.status(201).json({
      id: questionId,
      quizId,
      type,
      text,
      options,
      order: questionOrder,
    });
  } catch (err) {
    console.error('CreateQuestion error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * PUT /api/quizzes/:quizId/questions/:questionId
 * Обновить вопрос
 */
export async function updateQuestion(req, res) {
  try {
    const { quizId, questionId } = req.params;
    const { type, text, imageUrl, options } = req.body;

    const db = getDb();

    // Проверить права
    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?',
      [quizId, req.user.id]
    );
    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    // Обновить вопрос
    await db.run(
      `UPDATE questions SET type = ?, text = ?, image_url = ? WHERE id = ? AND quiz_id = ?`,
      [type, text, imageUrl || null, questionId, quizId]
    );

    // Обновить ответы — удалить старые и добавить новые
    if (options) {
      await db.run('DELETE FROM answers WHERE question_id = ?', [questionId]);

      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await db.run(
          `INSERT INTO answers (question_id, text, is_correct, answer_order)
           VALUES (?, ?, ?, ?)`,
          [questionId, opt.text, opt.isCorrect ? 1 : 0, i]
        );
      }
    }

    res.json({ message: 'Вопрос обновлен' });
  } catch (err) {
    console.error('UpdateQuestion error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * DELETE /api/quizzes/:quizId/questions/:questionId
 * Удалить вопрос
 */
export async function deleteQuestion(req, res) {
  try {
    const { quizId, questionId } = req.params;
    const db = getDb();

    // Проверить права
    const quiz = await db.get(
      'SELECT * FROM quizzes WHERE id = ? AND organizer_id = ?',
      [quizId, req.user.id]
    );
    if (!quiz) {
      return res.status(404).json({ message: 'Квиз не найден' });
    }

    await db.run('DELETE FROM questions WHERE id = ? AND quiz_id = ?', [questionId, quizId]);

    res.json({ message: 'Вопрос удален' });
  } catch (err) {
    console.error('DeleteQuestion error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}
