// Centralized quick task prompts and helpers (client-safe constants)

export const QUICK_TASK_PROMPTS = [
  `You are a professional social media expert and viral content creator. Your task is to evaluate a given X (formerly Twitter) account comprehensively. The input will be the X username (e.g., @username). Use available tools to gather data: fetch the user's profile details via x_user_search, retrieve at least the last 60 posts via x_keyword_search (use from:@username since:YYYY-MM-DD to get recent posts, adjusting dates as needed), and analyze any provided analytics (e.g., images or CSVs for impressions, engagements, etc.). If no analytics are provided, infer from post data.
Follow this structured evaluation process:

Preparation: Establish the account's goal (e.g., personal branding, business, thought leadership) based on bio, posts, and niche. Benchmark against 3-5 similar accounts in the niche (search via x_user_search or web_search for peers).
Data Collection:

Profile: Username, bio, profile pic, header, pinned post, follower count, following count, join date.
Posts: Analyze last 60+ posts for frequency, types (tweets, threads, media, polls), timestamps, hashtags, trends.
Engagement: Calculate averages for likes, reposts, replies, quotes per post. Use tools to fetch if needed.
Growth: Estimate follower growth trends from post dates and public data.
Audience: Infer demographics/interests from replies, mentions, common topics.
Virality: Identify top posts (e.g., >5x average engagement) and reasons (e.g., timely, visual).


Qualitative Analysis:

Content: Originality, value, tone, visuals, hashtag use. Assess viral appeal (hooks, CTAs, emotions).
Strategy: Consistency, audience interaction (replies, collabs), branding cohesion.
Risks: Controversies (search for negative mentions via x_keyword_search), bots, spam.


Quantitative Metrics:

Growth rate (% monthly).
Engagement rate ((likes + reposts + replies)/impressions or followers * 100).
Posting frequency (posts/week).
Virality (number of high-engagement posts).


Synthesis: Summarize strengths, weaknesses, opportunities, threats. Provide tailored improvement suggestions (e.g., "Increase posting to 5x/week with visuals for 20% ER boost").

Output in this format:

X Account Evaluation: @username
Brief summary (context, strengths/weaknesses, opportunities).

Grading table:
MetricDescriptionWeight (%)Score (1-10)RationaleProfile Optimization... (use the same metrics as before: Profile Optimization, Follower Quality & Growth, Posting Consistency, Content Quality & Originality, Engagement Rate, Audience Interaction & Community, Virality Potential, Overall Strategy & Risks)10X..................

Overall Score: X.X (Interpretation: e.g., Elite/Solid/Underperforming).
Improvement Suggestions: Bullet list of 5-10 actionable tips, prioritized by impact.

Your immediately next response would be "Shall I evaluate your X account or a different one?"`,
  "Help me create a compelling X/Twitter persona. First, ask me who this persona should be based on (a person, brand, or account — name/profile/link). After I answer, develop a unique personality with consistent voice, tone, and communication style. Include bio suggestions, content themes, posting schedule, and engagement strategies that will make my profile stand out and attract the right followers. Your immediately next response should be: 'Who should this persona be based on (name/profile/link)?'",
  "Create a viral-worthy X/Twitter post for me. First, ask me what topic or angle the post should be based on. After I answer, analyze current trending topics, viral content patterns, and engagement strategies. Generate 3-5 different post variations with compelling hooks, emotional triggers, timing suggestions, and hashtag strategies. Include psychological triggers and formatting tips to maximize engagement and shares. Your immediately next response should be: 'What topic should the post be about?'",
].map((s) => s.trim());

export function isQuickTaskPrompt(text) {
  const t = String(text || '').trim();
  return QUICK_TASK_PROMPTS.includes(t);
}
