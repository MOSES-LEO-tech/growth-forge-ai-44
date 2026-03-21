import { pool } from '../config/database';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ScholarshipMatch = {
  id: number;
  title: string;
  score: number;
  matchedCriteria: string[];
  missingCriteria: string[];
};
type Recommendations = { actions: string[] };

// Interfaces for scholarship matching
interface StudentProfile {
  gpa?: number;
  intended_course?: string;
  grade?: string;
  achievements: string[];
  skills: string[];
}

interface Scholarship {
  id: number;
  title: string;
  description: string | null;
  min_gpa?: number;
  eligible_courses?: string[];
  requirements?: string[];
  amount: number | null;
  deadline: Date | null;
}

// Calculate real scholarship match score based on student profile
function calculateScholarshipMatch(
  profile: StudentProfile,
  scholarship: Scholarship
): ScholarshipMatch {
  let score = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  // GPA matching (weighted 30%)
  if (profile.gpa !== undefined && scholarship.min_gpa !== undefined) {
    if (profile.gpa >= scholarship.min_gpa) {
      score += 30;
      matched.push(`GPA ${profile.gpa} meets requirement of ${scholarship.min_gpa}`);
    } else {
      missing.push(`GPA ${profile.gpa} below required ${scholarship.min_gpa}`);
    }
  } else if (scholarship.min_gpa === undefined) {
    score += 30; // No GPA requirement
    matched.push('No GPA requirement');
  }

  // Course matching (weighted 25%)
  if (profile.intended_course && scholarship.eligible_courses) {
    const courseMatch = scholarship.eligible_courses.some(c =>
      c.toLowerCase().includes(profile.intended_course!.toLowerCase())
    );
    if (courseMatch) {
      score += 25;
      matched.push(`Course "${profile.intended_course}" is eligible`);
    } else {
      missing.push(`Course "${profile.intended_course}" may not be eligible`);
    }
  } else if (!scholarship.eligible_courses || scholarship.eligible_courses.length === 0) {
    score += 25; // Open to all courses
    matched.push('Open to all courses');
  }

  // Achievement keyword matching (weighted 25%)
  const achievementText = profile.achievements.join(' ').toLowerCase();
  if (scholarship.requirements && scholarship.requirements.length > 0) {
    const matchedKeywords = scholarship.requirements.filter(req =>
      req.toLowerCase().split(' ').some(word =>
        word.length > 3 && achievementText.includes(word.toLowerCase())
      )
    );
    const keywordScore = Math.min(25, matchedKeywords.length * 8);
    score += keywordScore;
    if (matchedKeywords.length > 0) {
      matched.push(`Meets ${matchedKeywords.length} requirement keyword(s)`);
    }
  } else {
    score += 25; // No specific requirements
    matched.push('No specific requirements');
  }

  // Deadline proximity (weighted 20%)
  if (scholarship.deadline) {
    const daysUntilDeadline = Math.ceil(
      (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline > 0) {
      if (daysUntilDeadline <= 7) {
        score += 20; // Urgent - apply now!
        matched.push(`Deadline approaching: ${daysUntilDeadline} days left - apply ASAP!`);
      } else if (daysUntilDeadline <= 30) {
        score += 15;
        matched.push(`Deadline in ${daysUntilDeadline} days - good time to apply`);
      } else {
        score += 10;
        matched.push(`Deadline: ${daysUntilDeadline} days remaining`);
      }
    } else {
      missing.push('Scholarship deadline has passed');
    }
  } else {
    score += 20; // No deadline (ongoing)
    matched.push('No deadline - rolling applications');
  }

  return {
    id: scholarship.id,
    title: scholarship.title,
    score: Math.min(100, score),
    matchedCriteria: matched,
    missingCriteria: missing,
  };
}

// Get student profile for matching
async function getStudentProfile(userId: number): Promise<StudentProfile> {
  const profileRes = await pool.query(
    `SELECT intended_course, grade FROM profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileRes.rows[0] || {};

  const achievementsRes = await pool.query(
    `SELECT title, description FROM achievements WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  const projectsRes = await pool.query(
    `SELECT skills FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
    [userId]
  );

  return {
    intended_course: profile.intended_course,
    grade: profile.grade,
    achievements: achievementsRes.rows.map(a => `${a.title} ${a.description || ''}`),
    skills: projectsRes.rows.flatMap(p => p.skills || []),
  };
}

// Real scholarship matching algorithm
async function matchScholarshipsForStudent(userId: number, limit: number): Promise<ScholarshipMatch[]> {
  // Get student profile
  const studentProfile = await getStudentProfile(userId);

  // Get all scholarships (in production, this would be filtered by eligibility)
  const scholarshipsRes = await pool.query(
    `SELECT id, title, description, min_gpa, eligible_courses, requirements, amount, deadline 
         FROM scholarships 
         WHERE deleted_at IS NULL 
         ORDER BY deadline ASC NULLS LAST`
  );

  // Calculate matches for all scholarships
  const matches = scholarshipsRes.rows.map(scholarship =>
    calculateScholarshipMatch(studentProfile, scholarship as Scholarship)
  );

  // Filter out scholarships with no match and sort by score
  return matches
    .filter(m => m.score > 0) // Only return relevant matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Enhanced student context for AI
async function getStudentContext(userId: number): Promise<string> {
  const profileRes = await pool.query(
    `SELECT p.intended_course, p.gpa, p.subjects, p.graduation_year, u.full_name, u.grade,
                sl.level, sl.points, sl.achievements_count, sl.projects_count
         FROM profiles p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN student_levels sl ON sl.user_id = p.user_id
         WHERE p.user_id = $1`,
    [userId]
  );
  const profile = profileRes.rows[0] || {};

  const achievementsRes = await pool.query(
    `SELECT title, description, verified FROM achievements WHERE user_id = $1 AND deleted_at IS NULL LIMIT 10`,
    [userId]
  );
  const achievements = achievementsRes.rows;

  const projectsRes = await pool.query(
    `SELECT title, description, skills, verified FROM projects WHERE owner_id = $1 AND deleted_at IS NULL LIMIT 10`,
    [userId]
  );
  const projects = projectsRes.rows;

  const schoolRes = await pool.query(
    `SELECT s.name, s.location FROM schools s
         JOIN users u ON u.school_id = s.id
         WHERE u.id = $1`,
    [userId]
  );
  const school = schoolRes.rows[0];

  let context = `Student Profile:\n`;
  context += `Name: ${profile.full_name || 'Unknown'}\n`;
  context += `Grade: ${profile.grade || 'N/A'}\n`;
  context += `Intended Course: ${profile.intended_course || 'Undecided'}\n`;
  context += `GPA: ${profile.gpa || 'N/A'}\n`;
  context += `Graduation Year: ${profile.graduation_year || 'N/A'}\n`;

  if (school) {
    context += `School: ${school.name} (${school.location || 'N/A'})\n`;
  }

  if (profile.level) {
    context += `Student Level: ${profile.level} (${profile.points || 0} points)\n`;
  }

  context += `Subjects: ${JSON.stringify(profile.subjects) || 'None listed'}\n\n`;

  const verifiedAchievements = achievements.filter(a => a.verified);
  if (verifiedAchievements.length > 0) {
    context += `Verified Achievements (${verifiedAchievements.length}):\n`;
    for (const a of verifiedAchievements) {
      context += `- ${a.title}: ${a.description || ''} ✓\n`;
    }
    context += `\n`;
  }

  if (achievements.length > verifiedAchievements.length) {
    context += `Other Achievements:\n`;
    for (const a of achievements.filter(a => !a.verified)) {
      context += `- ${a.title}: ${a.description || ''}\n`;
    }
    context += `\n`;
  }

  const verifiedProjects = projects.filter(p => p.verified);
  if (verifiedProjects.length > 0) {
    context += `Verified Projects (${verifiedProjects.length}):\n`;
    for (const p of verifiedProjects) {
      context += `- ${p.title}: ${p.description || ''} (Skills: ${JSON.stringify(p.skills) || 'N/A'}) ✓\n`;
    }
    context += `\n`;
  }

  if (projects.length > verifiedProjects.length) {
    context += `Other Projects:\n`;
    for (const p of projects.filter(p => !p.verified)) {
      context += `- ${p.title}: ${p.description || ''} (Skills: ${JSON.stringify(p.skills) || 'N/A'})\n`;
    }
  }

  return context;
}

// Generate personalized recommendations
async function generateRecommendationsForStudent(userId: number): Promise<Recommendations> {
  const actions: string[] = [];

  // Get student data
  const profileRes = await pool.query(
    `SELECT intended_course, gpa FROM profiles WHERE user_id = $1`,
    [userId]
  );
  const profile = profileRes.rows[0];

  const achievementsRes = await pool.query(
    `SELECT COUNT(*) as count FROM achievements WHERE user_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const achievementsCount = parseInt(achievementsRes.rows[0]?.count || '0');

  const projectsRes = await pool.query(
    `SELECT COUNT(*) as count FROM projects WHERE owner_id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  const projectsCount = parseInt(projectsRes.rows[0]?.count || '0');

  const verifiedAchievementsRes = await pool.query(
    `SELECT COUNT(*) as count FROM achievements WHERE user_id = $1 AND verified = true AND deleted_at IS NULL`,
    [userId]
  );
  const verifiedAchievements = parseInt(verifiedAchievementsRes.rows[0]?.count || '0');

  const verifiedProjectsRes = await pool.query(
    `SELECT COUNT(*) as count FROM projects WHERE owner_id = $1 AND verified = true AND deleted_at IS NULL`,
    [userId]
  );
  const verifiedProjects = parseInt(verifiedProjectsRes.rows[0]?.count || '0');

  // Generate personalized recommendations
  if (!profile?.intended_course) {
    actions.push('Complete your profile by adding your intended course of study');
  }

  if (!profile?.gpa) {
    actions.push('Add your GPA to your profile for better scholarship matches');
  }

  if (achievementsCount < 3) {
    actions.push('Add more achievements to showcase your accomplishments');
  }

  if (verifiedAchievements < achievementsCount / 2) {
    actions.push('Request verification from teachers for your unverified achievements');
  }

  if (projectsCount < 2) {
    actions.push('Create or add more projects to build your portfolio');
  }

  if (verifiedProjects < projectsCount / 2) {
    actions.push('Submit your projects for teacher verification');
  }

  if (actions.length === 0) {
    actions.push('Keep up the great work! Your profile is looking strong');
    actions.push('Consider mentoring other students on their portfolio building');
  }

  return { actions };
}

// Mock AI Generator (fallback when no API key)
async function* mockAIChat(userId: number, message: string, context: string): AsyncGenerator<string, void, unknown> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Simulate thinking
  yield 'data: {"text": "Thinking..."}\n\n';
  await delay(500);

  let response = "I see you're interested in that. ";

  const lowerMsg = message.toLowerCase();

  // Simple Keyword matching based on context
  if (context.includes('GPA: 4') || context.includes('GPA: 3.8') || context.includes('GPA: 3.9')) {
    if (lowerMsg.includes('scholarship') || lowerMsg.includes('money')) {
      response = "With your excellent GPA, you are a strong candidate for merit-based scholarships! I've found some matches for you above.";
    }
  }

  if (lowerMsg.includes('improve') || lowerMsg.includes('help')) {
    response = "To build a stronger portfolio, consider adding more detailed descriptions to your projects. Also, try to get more verified achievements from your teachers!";
  }

  if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    response = "Hello! I'm SmartBuddy. I've analyzed your profile and I'm ready to help you find scholarships and improve your portfolio. What's on your mind?";
  }

  if (response === "I see you're interested in that. ") {
    response = "That's an interesting point. Based on your profile, I'd suggest focusing on your unique strengths. Could you tell me more about your recent projects?";
  }

  // Stream response word by word
  const words = response.split(' ');
  for (const word of words) {
    yield `data: ${JSON.stringify({ text: word + ' ' })}\n\n`;
    await delay(50 + Math.random() * 50); // Random typing speed
  }

  yield 'data: [DONE]\n\n';

  // Log it
  await pool.query(
    `INSERT INTO ai_chat_logs (user_id, message_role, message_content) VALUES ($1, 'user', $2)`,
    [userId, message]
  );
  await pool.query(
    `INSERT INTO ai_chat_logs (user_id, message_role, message_content) VALUES ($1, 'assistant', $2)`,
    [userId, response]
  );
}

export async function* streamAIChat(userId: number, userMessage: string): AsyncGenerator<string, void, unknown> {
  // Get student context and matches
  const [studentContext, matches, recommendations] = await Promise.all([
    getStudentContext(userId),
    matchScholarshipsForStudent(userId, 5),
    generateRecommendationsForStudent(userId)
  ]);

  if (!LOVABLE_API_KEY) {
    // Use Mock
    yield* mockAIChat(userId, userMessage, studentContext);
    return;
  }

  const systemPrompt = `You are SmartBuddy, an AI assistant for students in Africa helping them build their portfolios and find scholarships.

${studentContext}

Top Scholarship Matches:
${matches.map((m: ScholarshipMatch, i: number) =>
    `${i + 1}. ${m.title} (Match Score: ${m.score}%)
     ✅ Matched: ${m.matchedCriteria.join(', ')}
     ${m.missingCriteria.length > 0 ? `⚠️ Missing: ${m.missingCriteria.join(', ')}` : ''}`
  ).join('\n')}

Recommended Actions:
${recommendations.actions.map((a: string) => `- ${a}`).join('\n')}

Guidelines:
- Be encouraging and supportive
- Give specific, actionable advice based on the student's profile
- Reference their achievements and projects when relevant
- Suggest scholarships that match their profile
- Keep responses concise but helpful
- Focus on African student opportunities when relevant`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      yield 'data: {"error": "AI service temporarily unavailable."}\n\n';
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield 'data: {"error": "Failed to read AI response"}\n\n';
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            yield 'data: [DONE]\n\n';
            return;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield `data: ${JSON.stringify({ text: content })}\n\n`;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    yield 'data: [DONE]\n\n';

    // Save to chat log (User msg)
    await pool.query(
      `INSERT INTO ai_chat_logs (user_id, message_role, message_content) VALUES ($1, 'user', $2)`,
      [userId, userMessage]
    );

  } catch (error) {
    console.error('AI streaming error:', error);
    yield 'data: {"error": "AI service error"}\n\n';
  }
}

// Legacy non-streaming function for backward compatibility
export async function buildChatResponse(userId: number, message: string) {
  const matches = await matchScholarshipsForStudent(userId, 5);
  const recos = await generateRecommendationsForStudent(userId);
  const intro = `Based on your profile and message: "${message}"`;
  const matchLines = matches.map((m: ScholarshipMatch, i: number) =>
    `${i + 1}. ${m.title} (score: ${m.score}%)`
  );
  const actionLines = recos.actions.map((a: string) => `- ${a}`);
  const text = [intro, '\nTop scholarships:', ...matchLines, '\nSuggested actions:', ...actionLines].join('\n');
  return { text, matches, recos };
}

// Export for testing
export { matchScholarshipsForStudent, generateRecommendationsForStudent, getStudentProfile };
