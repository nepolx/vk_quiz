const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

async function request(method, path, body) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

const get  = (path)        => request('GET',    path);
const post = (path, body)  => request('POST',   path, body);
const put  = (path, body)  => request('PUT',    path, body);
const del  = (path)        => request('DELETE', path);

// --- AUTH ---
export const auth = {
  register: (email, nick, password) =>
    post('/auth/register', { email, nick, password }),

  login: (email, password, role) =>
    post('/auth/login', { email, password, role }),

  me: () => get('/auth/me'),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
  },
};

// --- QUIZZES ---
export const quizzes = {
  list:   ()                    => get('/quizzes'),
  getQuiz:    (id)              => get(`/quizzes/${id}`),
  create: (data)                => post('/quizzes', data),
  update: (id, data)            => put(`/quizzes/${id}`, data),
  delete: (id)                  => del(`/quizzes/${id}`),
};

// --- QUESTIONS ---
export const questions = {
  create: (quizId, data)        => post(`/quizzes/${quizId}/questions`, data),
  update: (quizId, qId, data)   => put(`/quizzes/${quizId}/questions/${qId}`, data),
  delete: (quizId, qId)         => del(`/quizzes/${quizId}/questions/${qId}`),
};

// --- SESSIONS ---
export const sessions = {
  start:         (quizId)              => post('/sessions/start', { quizId }),
  join:          (code, nick)          => post('/sessions/join', { code, nick }),
  startQuiz:     (sessionId)           => post(`/sessions/${sessionId}/start-quiz`, {}),
  answer:        (sessionId, participantId, questionId, answerId) =>
                                          post(`/sessions/${sessionId}/answer`, { participantId, questionId, answerId }),
  next:          (sessionId)           => post(`/sessions/${sessionId}/next`, {}),
  results:       (sessionId)           => get(`/sessions/${sessionId}/results`),
  participants:  (sessionId)           => get(`/sessions/${sessionId}/participants`),

  // ДЛЯ ДАШБОРДА участника
  getHistory:    ()                    => get('/sessions/history'),   
  getStats:      ()                    => get('/users/stats'),
  
  // ДЛЯ ДАШБОРДА организатора
  getOrganizerStats:()                 => get('/users/organizer-stats'),

  // Получить историю завершенных игровых сессий для конкретного квиза
  getQuizSessionHistory: (quizId)      => get(`/sessions/quiz/${quizId}/completed`),
};
