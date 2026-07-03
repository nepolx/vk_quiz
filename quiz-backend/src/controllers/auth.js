import bcrypt from 'bcrypt';
import { getDb } from '../db/index.js';
import { generateToken } from '../middleware/auth.js';

/**
 * POST /api/auth/register
 * Регистрация нового пользователя
 * Body: { email, nick, password }
 */
export async function register(req, res) {
  try {
    const { email, nick, password } = req.body;

    // Валидация
    if (!email || !nick || !password) {
      return res.status(400).json({ message: 'Email, nick и password обязательны' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Пароль должен быть минимум 6 символов' });
    }

    if (!nick.trim() || nick.length < 2) {
      return res.status(400).json({ message: 'Никнейм минимум 2 символа' });
    }

    const db = getDb();

    // Проверка существования email
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ message: 'Email уже зарегистрирован' });
    }

    // Хеширование пароля
    const passwordHash = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await db.run(
      'INSERT INTO users (email, nick, password_hash) VALUES (?, ?, ?)',
      [email, nick.trim(), passwordHash]
    );

    const userId = result.lastID;

    res.status(201).json({
      message: 'Пользователь зарегистрирован',
      user: { id: userId, email, nick },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * POST /api/auth/login
 * Вход пользователя
 * Body: { email, password }
 * Returns: { token, user, role } где role = "organizer" | "participant"
 */
export async function login(req, res) {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'Email, password и role обязательны' });
    }

    if (!['organizer', 'participant'].includes(role)) {
      return res.status(400).json({ message: 'Неверная роль' });
    }

    const db = getDb();

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Проверка пароля
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Генерация JWT
    const token = generateToken(user.id, user.nick);

    res.json({
      token,
      user: { id: user.id, email: user.email, nick: user.nick },
      role,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}

/**
 * GET /api/auth/me
 * Получить данные текущего пользователя (требует токена)
 */
export async function getMe(req, res) {
  try {
    const db = getDb();
    const user = await db.get('SELECT id, email, nick, created_at FROM users WHERE id = ?', [
      req.user.id,
    ]);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
}
