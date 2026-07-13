// Filtro básico de palavras ofensivas para nomes de usuário. Não é uma
// solução perfeita de moderação (não pega leetspeak, espaçamento
// criativo etc.) — é só uma primeira barreira client-side para dar
// feedback instantâneo; o bloqueio de verdade acontece no banco (trigger
// em profiles), que roda independente de por onde a alteração chegou.
// Comparação é por palavra inteira, não substring, pra não pegar nomes
// legítimos que por acaso contêm a sequência de letras (ex.: "Paulo").
const BLOCKED_WORDS = new Set([
  'porra',
  'caralho',
  'merda',
  'bosta',
  'puta',
  'putas',
  'putaria',
  'foda',
  'fodase',
  'fudeu',
  'cacete',
  'desgraca',
  'desgracado',
  'desgracada',
  'arrombado',
  'arrombada',
  'cuzao',
  'cuzo',
  'cu',
  'buceta',
  'piroca',
  'pinto',
  'xoxota',
  'corno',
  'cornao',
  'babaca',
  'imbecil',
  'idiota',
  'retardado',
  'retardada',
  'escroto',
  'escrota',
  'punheta',
  'boceta',
  'rola',
  'xana',
  'fdp',
])

const BLOCKED_PHRASES = ['filho da puta', 'filha da puta', 'vai se fuder', 'vai tomar no cu']

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function containsOffensiveLanguage(text: string): boolean {
  const normalized = normalize(text)
  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  if (words.some((w) => BLOCKED_WORDS.has(w))) return true
  return BLOCKED_PHRASES.some((phrase) => normalized.includes(phrase))
}
