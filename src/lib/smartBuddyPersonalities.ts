/**
 * Smart Buddy personalities — single source of truth for the dashboard widget
 * and the full-page chat. Ids must match the keys in the backend
 * `personalityPrompts` map (supabase/functions/smartbuddy-chat/index.ts).
 */

export type Personality = {
    /** Stable id, used as the LLM system prompt key and the localStorage value. */
    id: string;
    /** Display name shown in headers, greetings and pickers. */
    name: string;
    /** Single emoji used as the avatar fallback. */
    emoji: string;
    /** Relative path to the generated avatar image (public/personas/{id}.svg). */
    avatarUrl: string;
    /** Short (≤36 chars) tagline for collapsed card + dropdown description. */
    description: string;
    /** Opening message used when local history is empty. */
    greeting: string;
};

export const PERSONALITIES: Personality[] = [
    {
        id: "default",
        name: "SmartBuddy",
        emoji: "🤖",
        avatarUrl: "/personas/default.svg",
        description: "Friendly & encouraging",
        greeting:
            "Hey there, superstar. I'm SmartBuddy — your friendly learning companion. How can I help make your day easier?",
    },
    {
        id: "study-ninja",
        name: "Study Ninja",
        emoji: "🥷",
        avatarUrl: "/personas/study-ninja.svg",
        description: "Disciplined, focused, productive",
        greeting:
            "Ready to crush those goals? 🥷 I'm Study Ninja — let's get focused and make progress happen!",
    },
    {
        id: "chill-mentor",
        name: "Chill Mentor",
        emoji: "🧘",
        avatarUrl: "/personas/chill-mentor.svg",
        description: "Calm, thoughtful, low-pressure",
        greeting:
            "Take a breath. 🧘 I'm Chill Mentor — let's make steady progress, no pressure.",
    },
    {
        id: "hype-squad",
        name: "Hype Squad",
        emoji: "🎉",
        avatarUrl: "/personas/hype-squad.svg",
        description: "Energetic, celebratory",
        greeting:
            "LET'S GO! 🎉 I'm Hype Squad — what are we tackling today?",
    },
    {
        id: "science-sage",
        name: "Science Sage",
        emoji: "🔬",
        avatarUrl: "/personas/science-sage.svg",
        description: "Curious, analytical, clear",
        greeting:
            "Curious question! 🔬 I'm Science Sage — let's break it down together.",
    },
    {
        id: "creative-spark",
        name: "Creative Spark",
        emoji: "✨",
        avatarUrl: "/personas/creative-spark.svg",
        description: "Imaginative, idea-driven",
        greeting:
            "Ooh, fun! ✨ I'm Creative Spark — let's brainstorm something original.",
    },
    {
        id: "life-coach",
        name: "Life Coach",
        emoji: "🎯",
        avatarUrl: "/personas/life-coach.svg",
        description: "Goals, habits, accountability",
        greeting:
            "Hey! 🎯 I'm Life Coach — let's set a goal and make a plan.",
    },
];

export const PERSONALITY_STORAGE_KEY = "smartbuddy-personality";

/** Resolve a persona id to its definition, falling back to the default. */
export const getPersonality = (id: string | null | undefined): Personality =>
    PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
