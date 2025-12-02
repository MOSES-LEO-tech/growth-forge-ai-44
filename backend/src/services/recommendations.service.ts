import { matchScholarshipsForStudent } from './match.service';
import { pool } from '../config/database';

type Recommendations = {
  scholarships: Array<{ scholarshipId: number; title: string; score: number }>;
  events: string[];
  learning: string[];
  actions: string[];
};

export async function generateRecommendationsForStudent(studentId: number): Promise<Recommendations> {
  const matches = await matchScholarshipsForStudent(studentId, 5);

  const eventsRes = await pool.query(
    "SELECT type, COUNT(*)::int AS count FROM events WHERE created_by = $1 AND deleted_at IS NULL GROUP BY type",
    [studentId]
  );

  const eventTypes = new Set<string>();
  for (const row of eventsRes.rows) eventTypes.add(row.type);

  const actions: string[] = [];
  const learning: string[] = [];

  if (!eventTypes.has('code')) actions.push('Join a coding club or hackathon');
  if (!eventTypes.has('sports')) actions.push('Participate in a school sports team');
  if (!eventTypes.has('debate')) actions.push('Enter debate competitions');

  learning.push('Prepare a portfolio page for key projects');
  learning.push('Collect certificates and proof links for achievements');

  return {
    scholarships: matches.map((m) => ({ scholarshipId: m.scholarshipId, title: m.title, score: m.score })),
    events: Array.from(eventTypes),
    learning,
    actions,
  };
}

