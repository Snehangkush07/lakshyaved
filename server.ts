import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load local .env file in Node environments (Node 20.6+)
try {
  process.loadEnvFile?.();
} catch {
  // .env is optional or already injected by the runtime environment
}

function loadRolesDataset(): any[] {
  try {
    const rolesPath = path.join(process.cwd(), "src/core/data/roles.v1.json");
    if (fs.existsSync(rolesPath)) {
      return JSON.parse(fs.readFileSync(rolesPath, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading roles dataset in server:", e);
  }
  return [];
}

function getOfflineCareerAdvice(query: string, context: any): string {
  const q = query.toLowerCase();
  const allRoles = loadRolesDataset();

  // Check if user is asking about a specific role in Lakshyaved dataset
  const matchedRole = allRoles.find(
    (r) =>
      r.roleName &&
      (q.includes(r.roleName.toLowerCase()) ||
        (r.aliases && r.aliases.some((a: string) => q.includes(a.toLowerCase()))))
  );

  if (matchedRole) {
    const salaryText = matchedRole.baseSalaryINR && matchedRole.seniorSalaryINR
      ? `₹${(matchedRole.baseSalaryINR / 100000).toFixed(1)}L - ₹${(matchedRole.seniorSalaryINR / 100000).toFixed(1)}L INR/year`
      : 'Competitive market rate';

    const reqSkills = matchedRole.requiredSkills || [];
    const niceSkills = matchedRole.niceToHaveSkills || [];
    const userSkills = Array.isArray(context?.skills) ? context.skills.map((s: string) => s.toLowerCase()) : [];
    
    const acquired = reqSkills.filter((s: string) => userSkills.includes(s.toLowerCase()));
    const missing = reqSkills.filter((s: string) => !userSkills.includes(s.toLowerCase()));

    return `### 🎯 Career Blueprint: ${matchedRole.roleName}

Here is the data-driven profile breakdown for **${matchedRole.roleName}** based on current industry benchmarks in Lakshyaved:

#### 📊 Market & Compensation Overview
- **Market Demand Level:** \`${(matchedRole.demandLevel || 'High').toUpperCase()}\`
- **Estimated Compensation Range:** **${salaryText}**
- **Category:** ${matchedRole.category || 'Technology & Engineering'}

#### 🛠️ Core Required Skills
${reqSkills.map((s: string) => `- **${s}** ${acquired.includes(s) ? '*(✅ Verified in your profile)*' : ''}`).join('\n')}

${niceSkills.length > 0 ? `#### 🚀 High-Value Differentiators (Nice-to-Have)\n${niceSkills.map((s: string) => `- ${s}`).join('\n')}` : ''}

${missing.length > 0 ? `#### 📌 Recommended Next Steps for Your Profile
You have covered **${acquired.length} of ${reqSkills.length}** core skills. Prioritize bridging these remaining skill gaps:
${missing.map((s: string) => `- ⏳ **${s}**: Build a dedicated portfolio project demonstrating real-world production usage.`).join('\n')}` : ''}

${matchedRole.transitionTo?.length > 0 ? `#### 📈 Natural Next Career Milestones\n${matchedRole.transitionTo.map((t: string) => `- ${t.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`).join('\n')}` : ''}
`;
  }

  // Interview preparation
  if (q.includes("interview") || q.includes("coding interview") || q.includes("prepare") || q.includes("algorithm")) {
    return `### 🎯 Strategic Technical & Coding Interview Preparation Roadmap

Preparing for modern technical interviews requires a balanced approach combining problem-solving patterns, system design, and behavioral storytelling:

#### 1. Data Structures & Algorithms (The Core Patterns)
- **Top Patterns to Master:** Two Pointers, Sliding Window, Fast & Slow Pointers, Monotonic Stack, Top-K Elements (Heap), and Graph BFS/DFS.
- **Practice Strategy:** Don't memorize solutions; identify the underlying problem archetype. Focus on writing clean code, analyzing Time ($O$) and Space ($O$) complexity upfront.
- **Mock Interviews:** Practice verbalizing your thought process out loud before writing line 1 of code.

#### 2. System Design & Architecture
- **Fundamentals:** Load balancers, caching (Redis), relational vs. NoSQL tradeoffs, horizontal vs. vertical scaling, message queues (Kafka/RabbitMQ).
- **Communication:** Always clarify functional and non-functional requirements (throughput, latency, availability) in the first 5 minutes.

#### 3. Behavioral Excellence (The STAR Method)
- Structure every behavioral story: **Situation**, **Task**, **Action** (what *you* did), and **Result** (with quantifiable metrics).
- Prepare 4 core stories: a challenging technical bug, cross-team conflict resolution, a tight deadline tradeoff, and mentoring someone.

${context?.targetRole ? `\n> **Tip for your ${context.targetRole} journey:** Review standard architectural questions relevant to ${context.targetRole} and reinforce required skills like ${context.missingSkills?.slice(0, 3)?.join(', ') || 'core distributed patterns'}.` : ''}
`;
  }

  // Full Stack Developer Roadmap
  if (q.includes("full stack") || q.includes("roadmap") || q.includes("career path")) {
    return `### 🚀 Comprehensive Full Stack Developer Career Pathway

Here is a structured roadmap to progress from foundational engineering to senior full-stack mastery:

#### 1. Frontend Engineering Core
- **Modern JavaScript & TypeScript:** ESNext semantics, asynchronous programming, closures, strict type systems.
- **Component Architecture:** React 18+ (Hooks, state lifecycles, memoization, Server Components) or Vue 3.
- **Styling & Accessibility:** Tailwind CSS, responsive mobile-first layouts, WCAG 2.1 AA accessibility standards.

#### 2. Backend & API Services
- **Runtime & Frameworks:** Node.js / Express, Python / FastAPI, or Go.
- **API Design:** RESTful conventions, GraphQL fundamentals, WebSocket event streaming for real-time applications.
- **Databases & ORMs:** PostgreSQL (schema design, indexing, ACID transactions), Redis for caching, MongoDB for document storage.

#### 3. DevOps & Cloud Readiness
- **CI/CD:** GitHub Actions workflows, containerization with Docker, reverse proxying with Nginx.
- **Cloud Infrastructure:** Serverless and containerized deployment (AWS ECS/Lambda, GCP Cloud Run).
- **Observability:** Logging (Winston, Pino), metrics monitoring, and error tracking (Sentry).

${context?.targetRole ? `\n> **Your Current Profile:** Targeting **${context.targetRole}** with **${context.readinessScore || 0}% readiness**. Prioritize bridging gaps in: **${context.missingSkills?.join(', ') || 'Advanced deployment & architecture'}**.` : ''}
`;
  }

  // Resume building tips
  if (q.includes("resume") || q.includes("cv") || q.includes("portfolio")) {
    return `### 📄 High-Impact Tech Resume & Portfolio Blueprint

Recruiters and hiring managers spend an average of 6–10 seconds on an initial scan. Here is how to stand out:

#### 1. The Google XYZ Formula
Every single bullet point under your experience should follow:
> **"Accomplished [X] as measured by [Y], by doing [Z]"**
- *Weak:* "Built backend APIs in Express and Node."
- *Strong:* "Architected 14 RESTful microservices in Node.js/Express, cutting p99 query latency by 42% and supporting 50k+ daily active users."

#### 2. ATS (Applicant Tracking System) Alignment
- Use a single-column, clean layout without icons or complex multi-column tables.
- Standardize section headers: **Summary**, **Core Technical Skills**, **Professional Experience**, **Key Projects**, and **Education**.
- Group skills logically: *Languages*, *Frameworks*, *Databases & Cloud*, and *Developer Tools*.

#### 3. Proof of Work (Key Projects)
- Include live URLs and GitHub repositories with well-written READMEs, architectural diagrams, and test suites.
- Highlight technical complexity (e.g., caching strategies, rate limiting, responsive UI, offline persistence) rather than generic tutorial clones.
`;
  }

  // General career advice
  return `### 💡 Career Guidance & Strategic Next Steps

Here are strategic recommendations tailored for technical career acceleration:

1. **Focus on T-Shaped Depth:** Build broad competence across modern software development while establishing deep, undeniable expertise in 1–2 specific domains (e.g., scalable frontend architecture, backend distributed systems, or cloud infrastructure).
2. **Build Public Evidence:** Active GitHub repositories, technical blog posts explaining architecture tradeoffs, or open-source contributions prove your capability faster than credentials alone.
3. **Continuous Skill Auditing:** Regularly compare your skill set against current industry job postings (just like in the **Lakshyaved Skill Gap Analyzer**).

${context?.targetRole ? `\n**Your Lakshyaved Context:**
- **Target Role:** ${context.targetRole}
- **Current Verified Skills:** ${context.skills?.join(', ') || 'None selected'}
- **Next High-Priority Skills:** ${context.missingSkills?.slice(0, 4)?.join(', ') || 'Continue building portfolio projects'}` : ''}

*Ask me about specific interview questions, tech stacks, career transitions, or resume optimization tips!*
`;
}

// Models in order of capability & availability (gemini-3.8-flash as primary text model)
const MODEL_FALLBACK_LIST = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

async function callGeminiWithRetryAndFallback(
  ai: GoogleGenAI,
  contents: any[],
  systemInstruction: string
): Promise<{ text: string; model: string }> {
  const maxRetriesPerModel = 3;
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LIST) {
    for (let attempt = 0; attempt < maxRetriesPerModel; attempt++) {
      try {
        console.log(`[Career AI] Trying model ${model} (attempt ${attempt + 1}/${maxRetriesPerModel})...`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        if (response.text) {
          console.log(`[Career AI] Model ${model} successfully returned response.`);
          return { text: response.text, model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "").toLowerCase();
        const status = err?.status || err?.statusCode || (err?.response ? err.response.status : null);

        // If model is 404 or deprecated/unsupported for new accounts, switch immediately without futile retries
        if (status === 404 || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("no longer available")) {
          console.warn(`[Career AI Fallback] Model ${model} unavailable (${errMsg.slice(0, 60)}). Immediately trying next fallback model...`);
          break;
        }

        const isTransient =
          status === 503 ||
          status === 429 ||
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("unavailable") ||
          errMsg.includes("resource_exhausted") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded") ||
          errMsg.includes("quota") ||
          errMsg.includes("temporarily unavailable");

        if (isTransient && attempt < maxRetriesPerModel - 1) {
          // Exponential backoff: 1s, 2s, 4s (+ jitter)
          const delay = Math.round(1000 * Math.pow(2, attempt) + Math.random() * 300);
          console.warn(
            `[Career AI Retry] Model ${model} returned transient error 503/429. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetriesPerModel})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        console.warn(`[Career AI Fallback] Model ${model} exhausted retries. Switching to next model due to: ${errMsg.slice(0, 80)}`);
        break; // Break inner retry loop to try next model in fallback list
      }
    }
  }

  throw lastError || new Error("All AI models and retries were exhausted.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
      primaryModel: "gemini-3.8-flash",
      fallbackModels: MODEL_FALLBACK_LIST,
    });
  });

  // Career AI Chat
  app.post("/api/career-assistant/chat", async (req, res) => {
    try {
      const { messages, context } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Missing or invalid messages array" });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      let contextPrompt = "";
      if (context) {
        contextPrompt = `
User Lakshyaved Career Profile Context:
- Target Role: ${context.targetRole || "Not specified"}
- Verified Current Skills: ${Array.isArray(context.skills) && context.skills.length > 0 ? context.skills.join(", ") : "None specified"}
- Target Missing Skills: ${Array.isArray(context.missingSkills) && context.missingSkills.length > 0 ? context.missingSkills.join(", ") : "None"}
- Identified Interests: ${Array.isArray(context.interests) && context.interests.length > 0 ? context.interests.join(", ") : "None"}
- Career Readiness Score: ${context.readinessScore != null ? context.readinessScore + "%" : "Not yet calculated"}
Please actively utilize this profile context to personalize and tailor your advice when relevant.`;
      }

      const systemInstruction = `You are the Lakshyaved Career AI Assistant & Mentor.
You are an intelligent, empathetic, and actionable career counselor designed for tech professionals, engineers, students, and career changers.
Guidelines:
1. Provide structured, step-by-step, actionable advice with concrete skills, frameworks, tools, and timelines.
2. Structure answers with clean Markdown headings, bullet points, and code/example blocks when appropriate.
3. Be encouraging yet realistic regarding market trends, compensation, and learning curves.
4. When interview preparation is asked, offer both technical tips (coding/system design) and behavioral frameworks (STAR method).
5. When resume questions are asked, highlight quantifiable achievements (Action Verb + Task + Metric/Impact).
6. Keep recommendations aligned with the user's career trajectory and Lakshyaved's offline-first skill tracking ecosystem.
${contextPrompt}`;

      const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";

      if (apiKey) {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const contents = messages.map((msg: { role: string; content: string }) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));

        try {
          const result = await callGeminiWithRetryAndFallback(ai, contents, systemInstruction);
          return res.json({
            reply: result.text,
            source: result.model,
          });
        } catch (apiError: any) {
          console.warn("Gemini API call failed after retries and model fallbacks:", apiError?.message || apiError);
          // Graceful fallback to offline career recommendations
          const offlineReply = getOfflineCareerAdvice(lastUserMessage, context);
          return res.json({
            reply: offlineReply,
            source: "offline-fallback",
            notice: "The live AI service is currently experiencing high demand (HTTP 503/429). Lakshyaved seamlessly provided offline recommendations tailored to your profile.",
            isFallback: true,
          });
        }
      } else {
        // Fallback intelligent career advisory response when no key is set
        const reply = getOfflineCareerAdvice(lastUserMessage, context);
        return res.json({
          reply,
          source: "built-in",
          notice: "Response generated via Lakshyaved Career Advisory Engine. Set GEMINI_API_KEY in environment for live Gemini model answers.",
        });
      }
    } catch (error: any) {
      console.error("Career Assistant unexpected error:", error);
      const lastUserMessage = [...(req.body?.messages || [])].reverse().find((m: any) => m.role === "user")?.content || "";
      const offlineReply = getOfflineCareerAdvice(lastUserMessage, req.body?.context);
      res.json({
        reply: offlineReply,
        source: "offline-fallback",
        notice: "An unexpected network error occurred. Showing offline recommendations from Lakshyaved's local data store.",
        isFallback: true,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
