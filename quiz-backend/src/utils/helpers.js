// Генерирует код вроде X4-9K7
export function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    if (i === 2) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Расчёт баллов за правильный ответ (с штрафом за время)
export function calculateScore(isCorrect, timeUsed, timeLimit, maxScore = 100) {
  if (!isCorrect) return 0;
  
  const speedBonus = Math.max(0, 1 - (timeUsed / timeLimit));
  return Math.round(maxScore * (0.7 + 0.3 * speedBonus));
}

// Ранжирование участников
export function rankParticipants(results) {
  return results
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, place: i + 1 }));
}
