import { pool } from '../config/database';

type MatchResult = {
  scholarshipId: number;
  title: string;
  score: number;
  explanations: string[];
  missingRequirements: string[];
  deadline: string | null;
  amount: string | null;
};

const weights = {
  event: 0.3,
  skills: 0.3,
  subjects: 0.3,
  achievement: 0.1,
};

async function getStudentSignals(studentId: number) {
  const eventsRes = await pool.query(
    "SELECT type, COUNT(*)::int AS count FROM events WHERE created_by = $1 AND deleted_at IS NULL GROUP BY type",
    [studentId]
  );
  const projectsRes = await pool.query(
    "SELECT skills FROM projects WHERE owner_id = $1 AND deleted_at IS NULL",
    [studentId]
  );
  const achievementsRes = await pool.query(
    "SELECT id FROM achievements WHERE user_id = $1 AND deleted_at IS NULL",
    [studentId]
  );
  let profileRes: any = { rows: [] };
  try {
    profileRes = await pool.query(
      "SELECT subjects, intended_course, gpa, location, graduation_year FROM profiles WHERE user_id = $1",
      [studentId]
    );
  } catch (_) {
    profileRes = { rows: [] };
  }

  const eventTypes = new Set<string>();
  for (const row of eventsRes.rows) eventTypes.add(row.type);

  const skillSet = new Set<string>();
  for (const row of projectsRes.rows) {
    const skills = row.skills;
    if (skills && typeof skills === 'object') {
      if (Array.isArray(skills)) {
        for (const s of skills) skillSet.add(String(s).toLowerCase());
      } else {
        for (const k of Object.keys(skills)) skillSet.add(k.toLowerCase());
      }
    }
  }

  const achievementCount = achievementsRes.rows.length;

  const profile = profileRes.rows[0] || {};
  const subjects = new Set<string>();
  if (profile.subjects && Array.isArray(profile.subjects)) {
    for (const s of profile.subjects) subjects.add(String(s).toLowerCase());
  } else if (profile.subjects && typeof profile.subjects === 'object') {
    for (const k of Object.keys(profile.subjects)) subjects.add(k.toLowerCase());
  }

  return { eventTypes, skillSet, achievementCount, profile, subjects };
}

function overlapScore(a: Set<string>, b: string[] | undefined) {
  if (!b || b.length === 0) return 0;
  const nb = b.map((x) => String(x).toLowerCase());
  let match = 0;
  for (const x of nb) if (a.has(x)) match += 1;
  return nb.length > 0 ? match / nb.length : 0;
}

export async function matchScholarshipsForStudent(studentId: number, limit = 10): Promise<MatchResult[]> {
  const signals = await getStudentSignals(studentId);

  const scholarshipsRes = await pool.query(
    "SELECT id, title, description, amount::text AS amount, deadline, requirements, eligibility_criteria FROM scholarships WHERE deleted_at IS NULL AND (deadline IS NULL OR deadline >= CURRENT_DATE)"
  );

  const results: MatchResult[] = [];

  for (const s of scholarshipsRes.rows) {
    const elig = s.eligibility_criteria || {};
    const req = s.requirements || {};

    const gpaMin = typeof elig.gpa_min === 'number' ? elig.gpa_min : undefined;
    const majors = Array.isArray(elig.majors) ? elig.majors : undefined;
    const locations = Array.isArray(elig.location) ? elig.location : undefined;
    const gradYear = typeof elig.graduation_year === 'number' ? elig.graduation_year : undefined;

    const eventTypes = Array.isArray(elig.event_types) ? elig.event_types : undefined;
    const requiredSkills = Array.isArray(elig.skills)
      ? elig.skills
      : Array.isArray(req.skills)
      ? req.skills
      : undefined;
    const requiredSubjects = Array.isArray(elig.subjects) ? elig.subjects : undefined;

    if (gpaMin !== undefined) {
      const sgpa = signals.profile?.gpa;
      if (sgpa === null || sgpa === undefined || Number(sgpa) < gpaMin) continue;
    }
    if (majors && majors.length > 0) {
      const major = String(signals.profile?.intended_course || '').toLowerCase();
      const ok = majors.map((m: any) => String(m).toLowerCase()).includes(major);
      if (!ok) continue;
    }
    if (locations && locations.length > 0) {
      const loc = String(signals.profile?.location || '').toLowerCase();
      const ok = locations.map((l: any) => String(l).toLowerCase()).some((l: string) => loc.includes(l));
      if (!ok) continue;
    }
    if (gradYear !== undefined) {
      const gy = signals.profile?.graduation_year;
      if (!gy || Number(gy) !== gradYear) continue;
    }

    const eventComponent = overlapScore(signals.eventTypes, eventTypes);
    const skillsComponent = overlapScore(signals.skillSet, requiredSkills);
    const subjectsComponent = overlapScore(signals.subjects, requiredSubjects);
    const achievementComponent = Math.min(1, signals.achievementCount / 5);

    const score =
      weights.event * eventComponent +
      weights.skills * skillsComponent +
      weights.subjects * subjectsComponent +
      weights.achievement * achievementComponent;

    const explanations: string[] = [];
    if (eventComponent > 0) explanations.push('Events align');
    if (skillsComponent > 0) explanations.push('Project skills align');
    if (subjectsComponent > 0) explanations.push('Subjects align');
    if (achievementComponent > 0) explanations.push('Achievements contribute');

    const missingRequirements: string[] = [];
    if (eventComponent === 0 && eventTypes && eventTypes.length > 0) missingRequirements.push('Required event participation');
    if (skillsComponent === 0 && requiredSkills && requiredSkills.length > 0) missingRequirements.push('Required skills');
    if (subjectsComponent === 0 && requiredSubjects && requiredSubjects.length > 0) missingRequirements.push('Required subjects');

    results.push({
      scholarshipId: s.id,
      title: s.title,
      score,
      explanations,
      missingRequirements,
      deadline: s.deadline ? String(s.deadline) : null,
      amount: s.amount || null,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
