"""
services/ai_service.py — Abstract AI layer
Reads GOOGLE_API_KEY from config (loaded from .env).
Supports: Gemini (Google) | Mock (no key needed)

Frontend NEVER calls AI APIs directly.
All AI calls: Frontend → FastAPI → This service → Gemini
"""

import json
import random
from config import settings

# ── Gemini Client (lazy init) ─────────────────────────────────────────────────
_gemini_model = None


def _get_gemini():
    """Initialize Gemini client once, using key from .env via config."""
    global _gemini_model
    if _gemini_model is None:
        import google.generativeai as genai
        # API key comes from config, which reads from .env — never hardcoded
        genai.configure(api_key=settings.GOOGLE_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
    return _gemini_model


def _get_provider() -> str:
    """Determine which provider to use. Falls back to mock if key missing."""
    if settings.AI_PROVIDER == "gemini" and settings.GOOGLE_API_KEY:
        return "gemini"
    return "mock"


# ── Core generate function ────────────────────────────────────────────────────

async def generate(prompt: str, system_prompt: str = "", temperature: float = 0.7) -> str:
    """
    Core AI generation function.
    Routes to Gemini or Mock based on config.
    """
    provider = _get_provider()

    if provider == "gemini":
        return await _generate_gemini(prompt, system_prompt)
    else:
        return await _generate_mock(prompt, system_prompt)


async def _generate_gemini(prompt: str, system_prompt: str = "") -> str:
    """Call Google Gemini API."""
    try:
        model = _get_gemini()
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        print(f"Gemini error: {e} — falling back to mock")
        return await _generate_mock(prompt, system_prompt)


async def _generate_mock(prompt: str, system_prompt: str = "") -> str:
    """
    Realistic mock responses for demo/dev without an API key.
    Detects intent from the prompt and returns appropriate mock content.
    """
    prompt_lower = prompt.lower()

    if "summarize" in prompt_lower or "meeting" in prompt_lower or "transcript" in prompt_lower:
        return _mock_meeting_summary()
    elif "linkedin" in prompt_lower:
        return _mock_linkedin_post()
    elif "twitter" in prompt_lower or "tweet" in prompt_lower:
        return _mock_tweet_thread()
    elif "blog" in prompt_lower:
        return _mock_blog_post()
    elif "task" in prompt_lower or "roadmap" in prompt_lower or "plan" in prompt_lower:
        return _mock_task_plan()
    elif "idea" in prompt_lower or "startup" in prompt_lower or "expand" in prompt_lower:
        return _mock_idea_expansion()
    elif "research" in prompt_lower or "competitor" in prompt_lower or "market" in prompt_lower:
        return _mock_research()
    else:
        return _mock_generic_response()


# ── High-level service methods ────────────────────────────────────────────────

async def summarize_meeting(transcript: str) -> dict:
    system = (
        "You are an expert meeting analyst for startups. "
        "Extract structured information from meeting notes and transcripts."
    )
    prompt = f"""Analyze this meeting transcript and respond with valid JSON only:
{{
  "summary": "2-3 sentence executive summary",
  "key_points": ["point 1", "point 2", "point 3"],
  "action_items": ["action 1 (owner)", "action 2 (owner)"],
  "follow_up_email": "full draft email text"
}}

Transcript:
{transcript}"""

    result = await generate(prompt, system)
    try:
        # Strip markdown fences if present
        clean = result.strip().strip("```json").strip("```").strip()
        return json.loads(clean)
    except Exception:
        return {
            "summary": result[:300],
            "key_points": ["See full output above"],
            "action_items": ["Review and extract manually"],
            "follow_up_email": result,
        }


async def generate_content(topic: str, platform: str, tone: str, audience: str) -> str:
    platform_rules = {
        "linkedin": "Write a LinkedIn post. Hook in first line. Max 1300 chars. Use line breaks. End with a question.",
        "twitter": "Write a Twitter/X thread. 5 tweets max. Number them. Each tweet max 280 chars.",
        "blog": "Write a blog post outline with intro, 3 main sections, and conclusion.",
        "email": "Write a professional email with subject line, greeting, body, and CTA.",
        "announcement": "Write a product launch announcement. Exciting, punchy, clear CTA.",
    }
    rule = platform_rules.get(platform, "Write engaging content.")
    system = f"You are an expert startup content writer. {rule}"
    prompt = f"Topic: {topic}\nTone: {tone}\nTarget audience: {audience}\n\nGenerate the content:"
    return await generate(prompt, system)


async def expand_idea(title: str, description: str = "") -> str:
    system = "You are a sharp startup advisor. Be direct and opinionated."
    prompt = f"""Expand this startup idea with structured analysis:

Idea: {title}
{f'Description: {description}' if description else ''}

Provide:
## One-Line Pitch
## Target Audience
## Monetization Models (3 options)
## 3 MVP Features
## Main Risk & Mitigation
## Quick Go-To-Market (first 90 days)"""
    return await generate(prompt, system)


async def plan_tasks(goal: str, timeline_days: int = 30) -> str:
    system = "You are an expert startup execution coach. Be specific and time-bound."
    prompt = f"""Break down this startup goal into an actionable plan:

Goal: {goal}
Timeline: {timeline_days} days

Produce:
## Phase Breakdown (Week by Week)
## Key Milestones
## Daily Priority Tasks (top 5)
## Success Metrics
## Main Risks"""
    return await generate(prompt, system)


async def chat_response(message: str, history: list[dict] = None) -> str:
    system = (
        "You are StartupOS Copilot — a world-class AI advisor for startup founders. "
        "Think like a YC partner + McKinsey analyst. Be direct, sharp, and actionable. "
        "Never give generic advice. Always be specific."
    )
    context = ""
    if history:
        context = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-6:]])
        context = f"Previous conversation:\n{context}\n\n"
    return await generate(f"{context}User: {message}", system)


async def research_topic(query: str) -> str:
    system = "You are a startup market research expert. Be specific and data-driven."
    prompt = f"""Research this for a startup founder:

Query: {query}

Structure your response as:
## Market Overview
## Key Players & Competitors
## Market Opportunities
## Key Threats & Risks
## Strategic Recommendations"""
    return await generate(prompt, system)


# ── Mock response templates ───────────────────────────────────────────────────

def _mock_meeting_summary() -> str:
    return json.dumps({
        "summary": "The team aligned on Q4 priorities: launch the MVP by end of October, focus on user acquisition in November, and prep for Series A in December. Key blocker identified: need a senior backend engineer.",
        "key_points": [
            "MVP launch target: October 31st",
            "User acquisition goal: 500 signups in 30 days",
            "Series A prep begins December 1st",
            "Hiring priority: Senior Backend Engineer",
            "Weekly sync moved to Tuesdays at 10am"
        ],
        "action_items": [
            "Post backend engineer job listing (Priya, by Friday)",
            "Finalize MVP feature list (Raj, by Wednesday)",
            "Set up analytics dashboard (Dev team, by next Monday)",
            "Reach out to 5 potential beta users (Aisha, this week)"
        ],
        "follow_up_email": "Subject: Action Items from Today's Q4 Planning Meeting\n\nHi team,\n\nGreat session today. Here's a quick recap of what we aligned on:\n\n**Q4 Roadmap:**\n- October: MVP Launch\n- November: User Acquisition (500 signups)\n- December: Series A Prep\n\n**Your action items:**\n- Priya: Post backend engineer job listing by Friday\n- Raj: Finalize MVP feature list by Wednesday\n- Dev team: Analytics dashboard by next Monday\n- Aisha: Reach out to 5 beta users this week\n\nLet's reconvene next Tuesday at 10am to track progress.\n\nBest,\nThe StartupOS Team"
    }, indent=2)


def _mock_linkedin_post() -> str:
    return """I've been building in public for 6 months. Here's what no one tells you about launching a startup:

Most founders spend 80% of their time on things that don't matter.

I did the same thing. Until I built a system that forced me to focus.

Here's the 3-part framework that changed everything:

1. **Identify your ONE constraint** — What's the single thing blocking growth right now? Fix that. Nothing else.

2. **Batch your shallow work** — Emails, admin, meetings? One block per day, max 2 hours. The rest is deep work.

3. **Ship ugly, learn fast** — Your first version will embarrass you. Ship it anyway. Perfection is procrastination with a good excuse.

The founders who win aren't the smartest. They're the ones who can identify what matters and ruthlessly ignore everything else.

What's your current #1 constraint? Drop it below 👇

#startups #founder #buildinpublic #entrepreneurship"""


def _mock_tweet_thread() -> str:
    return """1/ Most startups don't fail because of bad products.

They fail because founders work on the wrong things.

Here's the system I use to stay focused: 🧵

2/ Every Monday morning, I ask myself one question:

"If I could only do ONE thing this week that would move the needle, what would it be?"

That becomes my north star.

3/ I then block 3 hours every morning for ONLY that task.

No Slack. No email. No meetings.

Just deep work on the thing that matters most.

4/ Everything else — emails, calls, admin — gets batched into one 2-hour window in the afternoon.

This isn't time management. It's priority management.

5/ The result?

We shipped our MVP in 6 weeks. Got our first 50 customers in 30 days. Raised our pre-seed in 3 months.

Focus is a superpower. Most founders just never learn to use it.

RT if this helped 🙏"""


def _mock_blog_post() -> str:
    return """# Why Most Startup Founders Are Working on the Wrong Things

## Introduction
There's a productivity crisis in the startup world — and it has nothing to do with working hard enough. Most founders are incredibly hardworking. The problem is they're working hard on the wrong things.

## Section 1: The Busy Trap
The modern startup ecosystem glorifies busyness. Packed calendars, endless Slack messages, back-to-back investor calls. But busyness is not progress. Activity is not traction.

The most dangerous place a founder can be is feeling productive while making no real progress toward product-market fit.

## Section 2: The Constraint Framework
Every business has one primary constraint at any given time. One thing that, if fixed, would unlock disproportionate growth. Your job as a founder is to identify and obliterate that constraint — then find the next one.

This is how you build momentum without burning out.

## Section 3: Building Systems, Not Habits
Habits can fail. Systems persist. The difference: a system is a structure that makes the right behavior the default behavior.

Build your schedule, your tools, and your team around making good decisions automatic.

## Conclusion
The founders who win aren't always the smartest or most technical. They're the ones who learn fastest what matters — and then have the discipline to focus only on that."""


def _mock_task_plan() -> str:
    return """## Phase Breakdown

**Week 1 — Foundation**
- Set up development environment and repo
- Define core features for MVP (max 3)
- Create landing page with waitlist
- Set up analytics (Mixpanel or PostHog)

**Week 2 — Build**
- Build core feature #1 (user auth + onboarding)
- Build core feature #2 (main product loop)
- Daily user interviews (minimum 2/day)

**Week 3 — Polish + Launch Prep**
- Bug fixes and UX polish
- Set up customer support channel
- Prepare launch assets (Product Hunt, LinkedIn, Twitter)

**Week 4 — Launch**
- Soft launch to waitlist (Day 22)
- Product Hunt launch (Day 25)
- Iterate based on feedback (Days 26-30)

## Key Milestones
- Day 3: Landing page live with waitlist
- Day 14: Internal MVP working end-to-end
- Day 22: First 10 real users onboarded
- Day 30: 100 signups, 20 active users, first revenue

## Daily Priority Tasks (Top 5)
1. Talk to 2 potential users
2. Ship one feature or fix
3. Write one piece of content
4. Check and respond to user feedback
5. Review metrics dashboard

## Success Metrics
- 100 waitlist signups by Day 10
- 20 active users by Day 25
- First paying customer by Day 30
- NPS > 40 from early users

## Main Risks
- **Building too much** — Mitigation: Lock feature scope before Day 1
- **No distribution plan** — Mitigation: Launch channels defined in Week 1
- **Slow iteration** — Mitigation: Daily deploys, no perfection"""


def _mock_idea_expansion() -> str:
    return """## One-Line Pitch
An AI-powered operating system for startup founders that replaces Notion + ChatGPT + Trello with one intelligent workspace.

## Target Audience
**Primary**: Solo founders and small startup teams (2-5 people) in pre-seed to seed stage
**Secondary**: Indie hackers, freelancers running productized services

## Monetization Models
1. **SaaS Subscription** — $29/mo (solo), $79/mo (team of 5), $199/mo (unlimited)
2. **Usage-based AI** — Base plan free, pay for AI credits ($10 per 1000 AI actions)
3. **Founder Communities** — White-label for accelerators and incubators ($500+/mo)

## 3 MVP Features
1. **AI Meeting Summarizer** — Paste transcript → get summary, action items, follow-up email
2. **AI Content Generator** — Topic + platform → LinkedIn post, tweet, blog in one click
3. **Smart Task Planner** — Enter goal → AI breaks into weekly tasks with priorities

## Main Risk & Mitigation
**Risk**: Crowded market (Notion AI, Linear AI, etc.)
**Mitigation**: Niche down to "founder workflow" specifically. Not a general tool. Every feature is designed for the specific problems founders face — investor updates, launch content, CRM, not generic project management.

## Quick Go-To-Market (First 90 Days)
- **Days 1-30**: Launch on Product Hunt, post daily on Twitter/LinkedIn about building in public
- **Days 31-60**: Partner with 3 startup accelerators for free access → collect testimonials
- **Days 61-90**: Launch affiliate program (30% recurring) targeting startup newsletters"""


def _mock_research() -> str:
    return """## Market Overview
The AI productivity tools market for SMBs is projected to reach $47B by 2027, growing at 28% CAGR. Startup-specific tooling is a $3.2B subset, currently underserved by generic tools.

## Key Players & Competitors
- **Notion AI** — General workspace with AI add-on. $10/user/mo. Weakness: not startup-specific
- **Linear** — Engineering-focused PM tool. $8/user/mo. Weakness: no AI content/CRM
- **Otter.ai** — Meeting transcription only. $17/mo. Single-purpose
- **Copy.ai** — Content generation only. $36/mo. No workflow integration

**Gap identified**: No single tool combines meeting intelligence + content generation + CRM + task planning for founders specifically.

## Market Opportunities
1. **Vertical SaaS** — Founder-specific tooling commands 2-3x pricing premium vs generic tools
2. **AI-native workflow** — Tools built AI-first (not AI-bolted-on) win on UX
3. **Community distribution** — YC, Techstars, On Deck are distribution channels, not just markets

## Key Threats & Risks
- Notion, Linear could add founder-specific features
- OpenAI building workflow tools directly
- Market education cost (changing existing tool habits)

## Strategic Recommendations
1. **Niche first** — Own "YC-batch founders" before expanding
2. **Ship fast** — First-mover advantage in vertical AI tooling is real
3. **Community GTM** — Partner with accelerators before paid acquisition
4. **Annual pricing** — Push annual plans hard to improve cash flow"""


def _mock_generic_response() -> str:
    responses = [
        "Great question. Here's my take based on what's worked for the best founders I've studied:\n\nThe key insight most people miss is that **speed of learning** matters more than speed of execution. Ship fast, measure everything, and iterate based on real user behavior — not assumptions.\n\nThe founders who win are obsessed with one metric and ignore everything else until that metric moves.",
        "Here's the direct answer you need:\n\n1. **Focus on the constraint** — What's the ONE thing blocking growth?\n2. **Talk to users daily** — Not weekly, not monthly. Daily.\n3. **Ship ugly** — A live product beats a perfect prototype every time.\n\nMost startup advice is noise. These three things are signal.",
        "From a strategic standpoint, you're looking at this the right way. The key is to sequence correctly:\n\n- **Foundation first** (product-market fit signals)\n- **Then distribution** (channels that scale)\n- **Then growth** (optimization and expansion)\n\nMost founders try to skip step one. That's why 90% fail.",
    ]
    return random.choice(responses)
