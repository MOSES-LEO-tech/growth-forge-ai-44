import { matchScholarshipsForStudent } from './match.service';
import { generateRecommendationsForStudent } from './recommendations.service';
import { pool } from '../config/database';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function getStudentContext(userId: number): Promise<string> {
  const profileRes = await pool.query(
    `SELECT p.intended_course, p.gpa, p.subjects, p.graduation_year, u.full_name, u.grade
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );
  const profile = profileRes.rows[0] || {};

  const achievementsRes = await pool.query(
    `SELECT title, description FROM achievements WHERE user_id = $1 AND deleted_at IS NULL LIMIT 5`,
    [userId]
  );
  const achievements = achievementsRes.rows;

  const projectsRes = await pool.query(
    `SELECT title, description, skills FROM projects WHERE owner_id = $1 AND deleted_at IS NULL LIMIT 5`,
    [userId]
  );
  const projects = projectsRes.rows;

  let context = `Student Profile:\n`;
  context += `Name: ${profile.full_name || 'Unknown'}\n`;
  context += `Grade: ${profile.grade || 'N/A'}\n`;
  context += `Intended Course: ${profile.intended_course || 'Undecided'}\n`;
  context += `GPA: ${profile.gpa || 'N/A'}\n`;
  context += `Graduation Year: ${profile.graduation_year || 'N/A'}\n`;
  context += `Subjects: ${JSON.stringify(profile.subjects) || 'None listed'}\n\n`;

  if (achievements.length > 0) {
    context += `Achievements:\n`;
    for (const a of achievements) {
      context += `- ${a.title}: ${a.description || ''}\n`;
    }
    context += `\n`;
  }

  if (projects.length > 0) {
    context += `Projects:\n`;
    for (const p of projects) {
      context += `- ${p.title}: ${p.description || ''} (Skills: ${JSON.stringify(p.skills) || 'N/A'})\n`;
    }
  }

  return context;
}

export async function* streamAIChat(userId: number, userMessage: string): AsyncGenerator<string, void, unknown> {
  if (!LOVABLE_API_KEY) {
    yield 'data: {"error": "AI service not configured"}\n\n';
    return;
  }

  // Get student context and matches
  const [studentContext, matches, recommendations] = await Promise.all([
    getStudentContext(userId),
    matchScholarshipsForStudent(userId, 5),
    generateRecommendationsForStudent(userId)
  ]);

  const systemPrompt = `You are SmartBuddy, an AI assistant for students in Africa helping them build their portfolios and find scholarships.

${studentContext}

Top Scholarship Matches:
${matches.map((m, i) => `${i + 1}. ${m.title} (Match Score: ${(m.score * 100).toFixed(0)}%) - ${m.explanations.join(', ')}`).join('\n')}

Recommended Actions:
${recommendations.actions.map(a => `- ${a}`).join('\n')}

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
      
      if (response.status === 429) {
        yield 'data: {"error": "Rate limit exceeded. Please try again in a moment."}\n\n';
        return;
      }
      if (response.status === 402) {
        yield 'data: {"error": "AI service quota exceeded."}\n\n';
        return;
      }
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

    // Flush remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && line.slice(6).trim() !== '[DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6).trim());
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield `data: ${JSON.stringify({ text: content })}\n\n`;
            }
          } catch {
            // Skip
          }
        }
      }
    }

    yield 'data: [DONE]\n\n';

    // Save to chat log
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
  const matchLines = matches.map((m, i) => `${i + 1}. ${m.title} (score ${m.score.toFixed(2)})`);
  const actionLines = recos.actions.map((a) => `- ${a}`);
  const text = [intro, '\nTop scholarships:', ...matchLines, '\nSuggested actions:', ...actionLines].join('\n');
  return { text, matches, recos };
}
