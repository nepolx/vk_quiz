import express from 'express';
import * as auth from '../controllers/auth.js';
import * as quizzes from '../controllers/quizzes.js';
import * as questions from '../controllers/questions.js';
import * as sessions from '../controllers/sessions.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ============ AUTH ============
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/me', authMiddleware, auth.getMe);

// ============ QUIZZES ============
router.get('/quizzes', authMiddleware, quizzes.getQuizzes);
router.get('/quizzes/:id', authMiddleware, quizzes.getQuiz);
router.post('/quizzes', authMiddleware, quizzes.createQuiz);
router.put('/quizzes/:id', authMiddleware, quizzes.updateQuiz);
router.delete('/quizzes/:id', authMiddleware, quizzes.deleteQuiz);

// ============ QUESTIONS ============
router.post('/quizzes/:quizId/questions', authMiddleware, questions.createQuestion);
router.put('/quizzes/:quizId/questions/:questionId', authMiddleware, questions.updateQuestion);
router.delete('/quizzes/:quizId/questions/:questionId', authMiddleware, questions.deleteQuestion);

// ============ SESSIONS ============
router.post('/sessions/start', authMiddleware, sessions.startSession);
router.post('/sessions/join', authMiddleware, sessions.joinSession);
router.post('/sessions/:sessionId/start-quiz', authMiddleware, sessions.startQuiz);
router.post('/sessions/:sessionId/answer', sessions.submitAnswer);
router.post('/sessions/:sessionId/next', authMiddleware, sessions.nextQuestion);
router.get('/sessions/history', authMiddleware, sessions.getHistory);
router.get('/sessions/:sessionId/results', sessions.getResults);
router.get('/sessions/:sessionId/participants', sessions.getParticipants);
router.get('/sessions/quiz/:quizId/completed', sessions.getQuizSessionHistory);

router.get('/users/stats', authMiddleware, sessions.getStats);
router.get('/users/organizer-stats', authMiddleware, sessions.getOrganizerStats);
export default router;
