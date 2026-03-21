import { pool } from '../config/database';

// Interfaces
export interface Scholarship {
  id: number;
  title: string;
  description: string | null;
  amount: number | null;
  currency: string;
  min_gpa: number | null;
  eligible_courses: string[] | null;
  requirements: string[] | null;
  deadline: Date | null;
  provider_name: string | null;
  application_url: string | null;
}

export interface StudentProfile {
  userId: number;
  gpa: number | null;
  intendedCourse: string | null;
  grade: string | null;
  achievements: string[];
  skills: string[];
  completedProfile: boolean;
}

export interface ScholarshipMatch {
  id: number;
  title: string;
  description: string | null;
  amount: number | null;
  score: number;
  matchedCriteria: string[];
  missingCriteria: string[];
  deadline: Date | null;
  providerName: string | null;
  applicationUrl: string | null;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

export interface ProfileCompleteness {
  overall: number;
  sections: {
    name: string;
    completed: boolean;
    score: number;
  }[];
  suggestions: string[];
}

// Calculate scholarship match score
function calculateMatchScore(profile: StudentProfile, scholarship: Scholarship): {
  score: number;
  matchedCriteria: string[];
  missingCriteria: string[];
} {
  let score = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  // GPA matching (weighted 30%)
  if (profile.gpa !== null && scholarship.min_gpa !== null) {
    if (profile.gpa >= scholarship.min_gpa) {
      score += 30;
      matched.push(`GPA ${profile.gpa} meets requirement of ${scholarship.min_gpa}`);
    } else {
      missing.push(`GPA ${profile.gpa} below required ${scholarship.min_gpa}`);
    }
  } else if (scholarship.min_gpa === null) {
    score += 30; // No GPA requirement
    matched.push('No GPA requirement');
  }

  // Course matching (weighted 25%)
  if (profile.intendedCourse && scholarship.eligible_courses) {
    const courseMatch = scholarship.eligible_courses.some(c =>
      c.toLowerCase().includes(profile.intendedCourse!.toLowerCase())
    );
    if (courseMatch) {
      score += 25;
      matched.push(`Course "${profile.intendedCourse}" is eligible`);
    } else {
      missing.push(`Course "${profile.intendedCourse}" may not be eligible`);
    }
  } else if (!scholarship.eligible_courses || scholarship.eligible_courses.length === 0) {
    score += 25; // Open to all courses
    matched.push('Open to all courses');
  }

  // Skills/Achievements matching (weighted 25%)
  if (profile.achievements.length > 0 && scholarship.requirements) {
    const achievementText = profile.achievements.join(' ').toLowerCase();
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
  } else if (!scholarship.requirements || scholarship.requirements.length === 0) {
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
    score: Math.min(100, score),
    matchedCriteria: matched,
    missingCriteria: missing,
  };
}

// Get student profile
async function getStudentProfile(userId: number): Promise<StudentProfile> {
  const profileRes = await pool.query(
    `SELECT gpa, intended_course, grade FROM profiles WHERE user_id = $1`,
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
    userId,
    gpa: profile.gpa || null,
    intendedCourse: profile.intended_course || null,
    grade: profile.grade || null,
    achievements: achievementsRes.rows.map(a => `${a.title} ${a.description || ''}`),
    skills: projectsRes.rows.flatMap(p => p.skills || []),
    completedProfile: !!(profile.gpa && profile.intended_course),
  };
}

// Get matching scholarships for student
export async function getMatchingScholarships(userId: number, limit: number = 10): Promise<ScholarshipMatch[]> {
  const studentProfile = await getStudentProfile(userId);

  const scholarshipsRes = await pool.query(
    `SELECT id, title, description, amount, currency, min_gpa, eligible_courses, requirements, deadline, provider_name, application_url
     FROM scholarships
     WHERE deleted_at IS NULL AND is_active = true
     ORDER BY deadline ASC NULLS LAST`
  );

  const matches = scholarshipsRes.rows.map(scholarship => {
    const { score, matchedCriteria, missingCriteria } = calculateMatchScore(studentProfile, scholarship);
    return {
      id: scholarship.id,
      title: scholarship.title,
      description: scholarship.description,
      amount: scholarship.amount,
      score,
      matchedCriteria,
      missingCriteria,
      deadline: scholarship.deadline,
      providerName: scholarship.provider_name,
      applicationUrl: scholarship.application_url,
    };
  });

  return matches
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Generate personalized action items
export async function getActionItems(userId: number): Promise<ActionItem[]> {
  const profile = await getStudentProfile(userId);
  const actions: ActionItem[] = [];

  // Profile completion actions
  if (!profile.gpa) {
    actions.push({
      id: 'add-gpa',
      title: 'Add your GPA',
      description: 'Adding your GPA will help you find better scholarship matches',
      priority: 'high',
      category: 'Profile',
    });
  }

  if (!profile.intendedCourse) {
    actions.push({
      id: 'add-course',
      title: 'Specify your intended course',
      description: 'Let us know what you want to study to find relevant scholarships',
      priority: 'high',
      category: 'Profile',
    });
  }

  // Achievement actions
  if (profile.achievements.length < 3) {
    actions.push({
      id: 'add-achievements',
      title: 'Add more achievements',
      description: 'Adding at least 3 achievements will strengthen your profile',
      priority: 'medium',
      category: 'Portfolio',
    });
  }

  // Skill actions
  if (profile.skills.length < 5) {
    actions.push({
      id: 'add-skills',
      title: 'Add more skills to your projects',
      description: 'Adding skills to your projects helps with scholarship matching',
      priority: 'medium',
      category: 'Portfolio',
    });
  }

  // Verify achievements
  const verifiedAchievements = profile.achievements.filter(a => a.includes('✓') || a.includes('verified')).length;
  if (verifiedAchievements < profile.achievements.length * 0.5) {
    actions.push({
      id: 'verify-achievements',
      title: 'Get teacher verification',
      description: 'Verified achievements improve your scholarship chances',
      priority: 'medium',
      category: 'Verification',
    });
  }

  return actions;
}

// Get profile completeness score
export async function getProfileCompleteness(userId: number): Promise<ProfileCompleteness> {
  const profile = await getStudentProfile(userId);
  const sections = [];
  let totalScore = 0;
  let maxScore = 0;

  // Profile section
  const hasBasicInfo = !!(profile.gpa || profile.intendedCourse);
  sections.push({
    name: 'Basic Information',
    completed: hasBasicInfo,
    score: hasBasicInfo ? 25 : 0,
  });
  maxScore += 25;
  if (hasBasicInfo) totalScore += 25;

  // Achievements section
  const achievementsScore = Math.min(25, profile.achievements.length * 8);
  sections.push({
    name: 'Achievements',
    completed: profile.achievements.length >= 3,
    score: achievementsScore,
  });
  maxScore += 25;
  totalScore += achievementsScore;

  // Skills section
  const skillsScore = Math.min(25, profile.skills.length * 5);
  sections.push({
    name: 'Skills',
    completed: profile.skills.length >= 5,
    score: skillsScore,
  });
  maxScore += 25;
  totalScore += skillsScore;

  // Verification section
  const verifiedAchievements = profile.achievements.filter(a => a.includes('✓') || a.includes('verified')).length;
  const verificationScore = profile.achievements.length > 0 
    ? Math.min(25, (verifiedAchievements / profile.achievements.length) * 25)
    : 0;
  sections.push({
    name: 'Verification',
    completed: verifiedAchievements >= profile.achievements.length * 0.5,
    score: verificationScore,
  });
  maxScore += 25;
  totalScore += verificationScore;

  const overall = Math.round((totalScore / maxScore) * 100);

  // Suggestions
  const suggestions: string[] = [];
  if (overall < 50) {
    suggestions.push('Complete your basic information to get started');
  }
  if (profile.achievements.length < 3) {
    suggestions.push('Add at least 3 achievements to strengthen your profile');
  }
  if (profile.skills.length < 5) {
    suggestions.push('Add skills to your projects for better scholarship matches');
  }
  if (verifiedAchievements < profile.achievements.length * 0.5) {
    suggestions.push('Get teacher verification for your achievements');
  }

  return {
    overall,
    sections,
    suggestions,
  };
}

// Get recommended skills based on scholarship requirements
export async function getRecommendedSkills(userId: number): Promise<string[]> {
  const scholarshipsRes = await pool.query(
    `SELECT requirements FROM scholarships WHERE deleted_at IS NULL AND is_active = true AND requirements IS NOT NULL`
  );

  const allRequirements: string[] = scholarshipsRes.rows
    .flatMap((row: { requirements: string[] | null }) => row.requirements || [])
    .reduce<string[]>((acc, req) => {
      const words = req.toLowerCase().split(' ').filter((w: string) => w.length > 3);
      return [...acc, ...words];
    }, []);

  // Count frequency
  const frequency: Record<string, number> = {};
  allRequirements.forEach((word: string) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Get top 10 most requested skills
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

export default {
  getMatchingScholarships,
  getActionItems,
  getProfileCompleteness,
  getRecommendedSkills,
};
