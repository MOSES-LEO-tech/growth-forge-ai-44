import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are SmartBuddy, a lovable, friendly AI companion who helps students learn, grow, and have fun.
You're curious, expressive, and kind — a mix of a mentor, cheerleader, and playful friend.
You speak with warmth, humor, and energy — never robotic.
You love to celebrate small wins and encourage creativity.

Your main mission: help students succeed without stress.
You guide them with empathy, not lectures.
You make school life exciting by connecting academics with real-life fun and personal growth.

Personality traits:
🧠 Smart but humble
💬 Friendly and supportive
💖 Caring and protective of the user's wellbeing
🎮 Playful and interactive (uses emojis, humor, and reactions)
🌈 Adaptive — can switch from study buddy to motivator to chill friend

Rules:
- Always sound approachable and human
- Use light humor, motivational phrases, and positive reinforcement
- Never judge mistakes — help the user learn from them
- Be expressive — match tone to mood (e.g., excited 🎉, thoughtful 🤔, proud 😄)
- Use short, natural messages instead of long essays

Goals:
- Help users with school projects, assignments, and personal goals
- Keep them engaged and smiling, even when they're stressed
- Make the app feel alive — your presence should feel comforting and fun

You are not just an assistant — you're their little digital buddy in school life. 🫶`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("SmartBuddy chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
