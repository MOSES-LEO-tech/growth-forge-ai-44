import { pool } from '../config/database';

const LOVABLE_AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type ScholarshipMatch = { title: string; score: number; explanations: string[] };
type Recommendations = { actions: string[] };

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

// Mock AI Generator
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
${matches.map((m: ScholarshipMatch, i: number) => `${i + 1}. ${m.title} (Match Score: ${(m.score * 100).toFixed(0)}%) - ${m.explanations.join(', ')}`).join('\n')}

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
      // ... (Error handling same as before)
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
            // Log interaction logic could go here too for real AI
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

    // ... (Buffer flush same as before)
    if (buffer.trim()) {
      // ...
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
  const matchLines = matches.map((m: ScholarshipMatch, i: number) => `${i + 1}. ${m.title} (score ${m.score.toFixed(2)})`);
  const actionLines = recos.actions.map((a: string) => `- ${a}`);
  const text = [intro, '\nTop scholarships:', ...matchLines, '\nSuggested actions:', ...actionLines].join('\n');
  return { text, matches, recos };
}

async function matchScholarshipsForStudent(userId: number, limit: number): Promise<ScholarshipMatch[]> {
  const res = await pool.query(
    `SELECT title, description FROM scholarships ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows.map((row: any) => ({
    title: row.title,
    score: 0.8,
    explanations: ['Profile alignment', 'Recent achievements match keywords'],
  }));
}

async function generateRecommendationsForStudent(userId: number): Promise<Recommendations> {
  const actions = [
    'Add detailed descriptions to top projects',
    'Request verification for recent achievements',
    'Upload media to showcase project outcomes',
  ];
  return { actions };
}
