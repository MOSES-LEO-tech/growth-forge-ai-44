import { matchScholarshipsForStudent } from './match.service';
import { generateRecommendationsForStudent } from './recommendations.service';

export async function buildChatResponse(studentId: number, message: string) {
  const matches = await matchScholarshipsForStudent(studentId, 5);
  const recos = await generateRecommendationsForStudent(studentId);
  const intro = `Analyzing profile and message: ${message}`;
  const matchLines = matches.map((m, i) => `${i + 1}. ${m.title} (score ${m.score.toFixed(2)})`);
  const actionLines = recos.actions.map((a) => `- ${a}`);
  const text = [intro, 'Top scholarships:', ...matchLines, 'Suggested actions:', ...actionLines].join('\n');
  return { text, matches, recos };
}

