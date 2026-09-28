import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin if not already initialized
if (!(admin as any).apps?.length) {
  try {
    (admin as any).initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log('[Auth] Firebase Admin initialized for project:', firebaseConfig.projectId);
  } catch (err) {
    console.warn('[Auth] Firebase Admin initialization notice:', err);
  }
}

// Lazy Gemini API client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Gemini] GEMINI_API_KEY environment variable is missing.');
    }
    genAIClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return genAIClient;
}

// Resilient Model Fallback Ladder ordered by availability and latency
const MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
  'gemini-2.5-pro',
];

interface FallbackOptions {
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
}

async function generateWithFallback(prompt: string, options: FallbackOptions = {}): Promise<string> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const model = MODEL_FALLBACK_CHAIN[i];
    try {
      const config: any = {};
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }
      if (typeof options.temperature === 'number') {
        config.temperature = options.temperature;
      }

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`[Gemini] Model ${model} failed (${err?.status || err?.code || 'error'}), attempting next model...`);
      lastError = err;
      
      // If 503 (UNAVAILABLE) or 429 (RESOURCE_EXHAUSTED), pause briefly before fallback
      const statusCode = err?.status || err?.code || (err?.error && err.error.code);
      if (statusCode === 503 || statusCode === 429 || statusCode === 'UNAVAILABLE' || statusCode === 'RESOURCE_EXHAUSTED') {
        await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
      }
      continue;
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || 'Unknown generation failure'}`);
}

// Safe JSON parser helper for structured Gemini responses
function parseSafeJson<T>(rawText: string, fallback: T): T {
  try {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const extracted = cleaned.substring(firstBrace, lastBrace + 1);
        return JSON.parse(extracted) as T;
      }

      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const extracted = cleaned.substring(firstBracket, lastBracket + 1);
        return JSON.parse(extracted) as T;
      }
      throw new Error('No JSON structure found in raw output');
    }
  } catch (err) {
    console.warn('[Gemini] JSON parsing error, returning fallback:', err);
    return fallback;
  }
}

// Extend Request type to hold authenticated user
interface AuthenticatedRequest extends Request {
  userUid?: string;
  userEmail?: string;
}

// Auth Middleware: extracts and verifies Firebase ID token
async function verifyFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In dev or preview, allow anonymous / guest token if explicitly marked
      const clientUid = req.headers['x-client-uid'] as string;
      if (clientUid) {
        req.userUid = clientUid;
        req.userEmail = (req.headers['x-client-email'] as string) || 'guest@mindbridge.local';
        return next();
      }
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    try {
      if ((admin as any).apps?.length) {
        const decoded = await (admin as any).auth().verifyIdToken(token);
        req.userUid = decoded.uid;
        req.userEmail = decoded.email || undefined;
      } else {
        // Fallback token extraction when admin credentials are unconfigured in preview
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decodedJson = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
          req.userUid = decodedJson.user_id || decodedJson.sub || 'authenticated_user';
          req.userEmail = decodedJson.email || undefined;
        } else {
          req.userUid = 'authenticated_user';
        }
      }
      return next();
    } catch (tokenErr) {
      console.warn('[Auth] Token verification failed:', tokenErr);
      return res.status(401).json({ error: 'Unauthorized: Invalid Firebase session token' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Authentication internal server error' });
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 1. Top-Level Request Deserialization (Ordering Guarantee & payload size limit)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'MindBridge AI Companion Engine',
      time: new Date().toISOString(),
    });
  });

  // ==========================================
  // API ROUTE: Reflection Companion
  // ==========================================
  app.post('/api/ai/reflection', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { messages = [], language = 'en', memories = [], userContext = {} } = body;

      const langInstruction = 
        language === 'hi' 
          ? 'Respond entirely in natural, fluent Hindi (Devanagari script).' 
          : language === 'hinglish' 
          ? 'Respond in friendly conversational Hinglish (Hindi blended with English, Roman script), warm and accessible.'
          : 'Respond in clean, supportive, empathetic English.';

      const memoryContext = memories.length > 0
        ? `\nRelevant User Memories:\n${memories.map((m: any) => `- [${m.category || 'Memory'}] ${m.keyTopic}: ${m.content}`).join('\n')}`
        : '';

      const systemInstruction = `You are MindBridge AI, a deeply empathetic, thoughtful, and pragmatic personal thinking and reflection companion.
Your goal is not just to flatter or provide generic answers, but to help the user unpack their thoughts, identify root emotional or situational drivers, explore what is within their control, and take clear, grounded steps forward.
${langInstruction}
Guidelines:
- Be warm, perceptive, non-judgmental, and constructive.
- Ask 1-2 thoughtful probing questions when the user is uncertain or stuck.
- Reference their goals or past memories naturally if provided without being creepy.
- Keep responses concise, articulate, and well-spaced.
${memoryContext}`;

      const conversationHistory = messages.map((m: any) => `${m.role === 'user' ? 'User' : 'MindBridge AI'}: ${m.content}`).join('\n\n');
      const prompt = `Current conversation:\n${conversationHistory}\n\nMindBridge AI:`;

      const aiResponse = await generateWithFallback(prompt, {
        systemInstruction,
        temperature: 0.7,
      });

      return res.json({ reply: aiResponse });
    } catch (err: any) {
      console.error('[AI Reflection Error]:', err);
      return res.status(500).json({ error: 'Failed to generate reflection response. Please try again.' });
    }
  });

  // ==========================================
  // API ROUTE: Extract Journal Intelligence
  // ==========================================
  app.post('/api/ai/intelligence', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { conversationText = '', language = 'en' } = body;

      const systemInstruction = `You are an AI intelligence extractor for personal journaling.
Analyze the user's reflection conversation and extract structured insights in JSON format.
Do NOT infer sensitive medical, racial, political, or psychological diagnoses.
Return a valid JSON object matching this schema:
{
  "mainTopic": "Short descriptive title",
  "keyPoints": ["Key takeaway 1", "Key takeaway 2"],
  "problem": "Core problem or challenge mentioned, or null if none",
  "goal": "Any explicit or implicit goal mentioned, or null if none",
  "importantDecisions": ["Decision made or considered"],
  "actionItems": ["Concrete next step"],
  "summary": "2-3 sentence thoughtful synthesis"
}`;

      const prompt = `Extract structured intelligence from this reflection entry:\n\n${conversationText}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const extracted = parseSafeJson(rawJson, {
        mainTopic: 'Personal Reflection',
        keyPoints: ['Reflected on recent experiences and priorities.'],
        problem: null,
        goal: null,
        importantDecisions: [],
        actionItems: [],
        summary: 'A thoughtful session examining current priorities and next steps.',
      });

      return res.json({ intelligence: extracted });
    } catch (err: any) {
      console.error('[AI Intelligence Error]:', err);
      return res.status(500).json({ error: 'Failed to extract journal intelligence.' });
    }
  });

  // ==========================================
  // API ROUTE: Deep Problem Solver
  // ==========================================
  app.post('/api/ai/problem-solve', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { problemDescription, category = 'General', language = 'en', memories = [] } = body;

      if (!problemDescription || typeof problemDescription !== 'string') {
        return res.status(400).json({ error: 'Problem description is required.' });
      }

      const langInstruction = 
        language === 'hi' 
          ? 'Output all titles, descriptions, and fields in Hindi.' 
          : language === 'hinglish' 
          ? 'Output in natural Hinglish.'
          : 'Output in English.';

      const systemInstruction = `You are MindBridge Real-Time Problem Solver Engine.
Your purpose is to take a real-world dilemma/problem and provide a masterclass in structured problem deconstruction, solution generation, trade-off analysis, and concrete action planning.
${langInstruction}
Return a single strictly valid JSON object matching this schema:
{
  "title": "Clear 3-6 word summary title of the problem",
  "analysis": {
    "mainProblem": "Core root problem statement",
    "rootCauses": ["Underlying factor 1", "Underlying factor 2", "Underlying factor 3"],
    "urgency": "Low" | "Medium" | "High" | "Critical",
    "impact": "Explanation of the impact on goals, peace of mind, or outcomes",
    "inUserControl": ["Specific aspect 1 within user control", "Aspect 2"],
    "outsideUserControl": ["External variable 1 outside direct control", "Variable 2"],
    "recommendationExplanation": "Clear, grounded reasoning for why the recommended solution is optimal."
  },
  "solutions": [
    {
      "id": "sol_1",
      "title": "Solution Name 1 (e.g., Direct & High-Impact Strategy)",
      "description": "Comprehensive explanation of this strategy",
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Drawback 1", "Drawback 2"],
      "risks": ["Potential risk 1", "Potential risk 2"],
      "difficulty": "Easy" | "Moderate" | "High" | "Expert",
      "expectedResult": "What realistic outcome looks like in 1-2 weeks"
    },
    {
      "id": "sol_2",
      "title": "Solution Name 2 (e.g., Collaborative / Incremental Pivot)",
      "description": "Comprehensive explanation of this alternative strategy",
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Drawback 1", "Drawback 2"],
      "risks": ["Potential risk 1"],
      "difficulty": "Easy" | "Moderate" | "High" | "Expert",
      "expectedResult": "What realistic outcome looks like"
    },
    {
      "id": "sol_3",
      "title": "Solution Name 3 (e.g., De-escalation & Protective Boundary)",
      "description": "Comprehensive explanation of a cautious or boundary-setting strategy",
      "advantages": ["Advantage 1", "Advantage 2"],
      "disadvantages": ["Drawback 1"],
      "risks": ["Potential risk 1"],
      "difficulty": "Easy" | "Moderate" | "High" | "Expert",
      "expectedResult": "What realistic outcome looks like"
    }
  ],
  "recommendedSolutionId": "sol_1",
  "actionPlan": [
    {
      "id": "step_1",
      "stepNumber": 1,
      "title": "Immediate First Step (Day 1)",
      "description": "Specific action to take within the next 24 hours",
      "completed": false
    },
    {
      "id": "step_2",
      "stepNumber": 2,
      "title": "Subsequent Milestone Step (Days 2-3)",
      "description": "Key execution step",
      "completed": false
    },
    {
      "id": "step_3",
      "stepNumber": 3,
      "title": "Follow-Through & Verification (Days 4-7)",
      "description": "Review progress and lock in the outcome",
      "completed": false
    }
  ]
}`;

      const prompt = `Problem Category: ${category}\nUser Problem Description:\n"${problemDescription}"\n\nGenerate structured real-time problem solver breakdown.`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      });

      let parsed = parseSafeJson<any>(rawJson, null);
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.solutions) || parsed.solutions.length === 0) {
        parsed = {
          title: parsed?.title || problemDescription.substring(0, 40),
          analysis: {
            mainProblem: parsed?.analysis?.mainProblem || problemDescription,
            rootCauses: Array.isArray(parsed?.analysis?.rootCauses) && parsed.analysis.rootCauses.length > 0
              ? parsed.analysis.rootCauses
              : ['Complex situational dynamics', 'Resource/time constraints', 'Communication gap'],
            urgency: parsed?.analysis?.urgency || 'Medium',
            impact: parsed?.analysis?.impact || 'Affects current momentum, focus, and productivity.',
            inUserControl: Array.isArray(parsed?.analysis?.inUserControl) && parsed.analysis.inUserControl.length > 0
              ? parsed.analysis.inUserControl
              : ['Your direct reaction and immediate response', 'Setting clear priorities', 'Choosing communication tone'],
            outsideUserControl: Array.isArray(parsed?.analysis?.outsideUserControl) && parsed.analysis.outsideUserControl.length > 0
              ? parsed.analysis.outsideUserControl
              : ['Others’ immediate emotional reaction', 'External systemic delays'],
            recommendationExplanation: parsed?.analysis?.recommendationExplanation || 'Focus on direct, phased action within your direct sphere of control.',
          },
          solutions: [
            {
              id: 'sol_1',
              title: 'Direct Action & Clear Alignment Strategy',
              description: 'Address the core bottleneck directly with clear, documented expectations and structured milestones.',
              advantages: ['Fast resolution', 'Clears ambiguity immediately'],
              disadvantages: ['Requires uncomfortable direct conversation'],
              risks: ['Initial pushback'],
              difficulty: 'Moderate',
              expectedResult: 'Clear direction and removed blockers within 3-5 days.',
            },
            {
              id: 'sol_2',
              title: 'Incremental Phased Execution',
              description: 'Break the problem down into bite-sized independent tasks that do not depend on external blockers.',
              advantages: ['Maintains personal progress', 'Low friction'],
              disadvantages: ['Slower overall resolution'],
              risks: ['Underlying friction remains unresolved'],
              difficulty: 'Easy',
              expectedResult: 'Steady progress on controllable deliverables.',
            },
            {
              id: 'sol_3',
              title: 'Protective Boundary & Escalation',
              description: 'Set explicit boundaries and escalate or document the roadblock to stakeholders.',
              advantages: ['Protects your time and sanity', 'Creates accountability'],
              disadvantages: ['May involve third parties'],
              risks: ['Potential friction'],
              difficulty: 'Moderate',
              expectedResult: 'Formal clarity on responsibilities.',
            },
          ],
          recommendedSolutionId: 'sol_1',
          actionPlan: [
            {
              id: 'step_1',
              stepNumber: 1,
              title: 'Define Immediate Controllable Action (Day 1)',
              description: 'Write down the single next step completely within your power and execute it.',
              completed: false,
            },
            {
              id: 'step_2',
              stepNumber: 2,
              title: 'Execute Alignment Communication (Days 2-3)',
              description: 'Communicate the clear boundary or requirement to involved parties politely and firmly.',
              completed: false,
            },
            {
              id: 'step_3',
              stepNumber: 3,
              title: 'Review Progress & Adjust (Days 4-7)',
              description: 'Check results, log an update in MindBridge, and lock in the final resolution.',
              completed: false,
            },
          ],
        };
      } else {
        // Ensure sub-arrays and required fields exist
        if (!parsed.analysis) {
          parsed.analysis = {
            mainProblem: problemDescription,
            rootCauses: ['Situational friction', 'Priority misalignment'],
            urgency: 'Medium',
            impact: 'Affects daily focus.',
            inUserControl: ['Your personal execution', 'Clarity of communication'],
            outsideUserControl: ['Others reactions'],
            recommendationExplanation: 'Target high-leverage steps within your direct control.',
          };
        }
        if (!Array.isArray(parsed.analysis.inUserControl)) {
          parsed.analysis.inUserControl = ['Direct personal action', 'Communication choices'];
        }
        if (!Array.isArray(parsed.analysis.outsideUserControl)) {
          parsed.analysis.outsideUserControl = ['External variables'];
        }
        if (!Array.isArray(parsed.actionPlan) || parsed.actionPlan.length === 0) {
          parsed.actionPlan = [
            {
              id: 'step_1',
              stepNumber: 1,
              title: 'First Action Step (Day 1)',
              description: 'Begin with the top recommended approach.',
              completed: false,
            },
            {
              id: 'step_2',
              stepNumber: 2,
              title: 'Follow-through Step (Days 2-3)',
              description: 'Execute intermediate milestone.',
              completed: false,
            },
          ];
        }
      }

      return res.json({ result: parsed });
    } catch (err: any) {
      console.error('[AI Problem Solve Error]:', err);
      return res.status(500).json({ error: 'Failed to analyze and solve problem. Please try again.' });
    }
  });

  // ==========================================
  // API ROUTE: Live Problem Updates
  // ==========================================
  app.post('/api/ai/problem-update', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { problemSession, userNote, language = 'en' } = body;

      if (!problemSession || !userNote) {
        return res.status(400).json({ error: 'Missing problemSession or userNote.' });
      }

      const systemInstruction = `You are MindBridge Real-Time Problem Solver maintaining ongoing situational context.
The user has provided a progress update or encountered a new obstacle on their problem.
Analyze their update, respond empathetically, and adjust the action strategy accordingly.
Return a valid JSON object matching:
{
  "aiResponse": "Empathetic, clear, and tactical response addressing what happened and how to proceed",
  "strategyAdjustment": "Summary of how the approach is modified based on this new information",
  "updatedActionPlan": [
    {
      "id": "string",
      "stepNumber": 1,
      "title": "Step title",
      "description": "Step detail",
      "completed": false
    }
  ]
}`;

      const contextPrompt = `Original Problem: "${problemSession.originalProblem}"
Current Selected Solution: "${problemSession.solutions?.find((s: any) => s.id === problemSession.selectedSolutionId)?.title || 'General Strategy'}"
Previous Updates History:
${(problemSession.updates || []).map((u: any) => `User update: ${u.userNote}\nAI response: ${u.aiResponse}`).join('\n\n')}

New User Update:
"${userNote}"

Generate adaptive response, strategy adjustment, and refreshed action plan.`;

      const rawJson = await generateWithFallback(contextPrompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
      });

      const parsed = parseSafeJson(rawJson, {
        aiResponse: 'Thank you for the update. Let us adjust our approach based on this result.',
        strategyAdjustment: 'Refined intermediate milestones to adapt to recent feedback.',
        updatedActionPlan: problemSession.actionPlan || [],
      });

      return res.json({ result: parsed });
    } catch (err: any) {
      console.error('[AI Problem Update Error]:', err);
      return res.status(500).json({ error: 'Failed to process problem update.' });
    }
  });

  // ==========================================
  // API ROUTE: Problem Resolution Summary
  // ==========================================
  app.post('/api/ai/problem-resolve', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { problemSession, language = 'en' } = body;

      const systemInstruction = `You are MindBridge AI summarizing a successfully resolved problem session.
Synthesize the entire trajectory into a clear Problem Resolution Summary in JSON format:
{
  "originalProblem": "Summary of the initial problem",
  "whatWasTried": ["Action or approach 1 attempted", "Action 2 attempted"],
  "whatWorked": ["Effective strategy that succeeded"],
  "whatFailed": ["Obstacles or ineffective attempts"],
  "finalSolution": "The definitive solution and resolution achieved",
  "lessonsLearned": ["Key insight 1 to remember for the future", "Key insight 2"],
  "resolvedAt": "${new Date().toISOString()}"
}`;

      const prompt = `Problem Session Data:\nOriginal: ${problemSession.originalProblem}\nAnalysis: ${JSON.stringify(problemSession.analysis)}\nUpdates: ${JSON.stringify(problemSession.updates)}\nCompleted Steps: ${JSON.stringify(problemSession.actionPlan?.filter((s: any) => s.completed))}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      });

      const parsed = parseSafeJson(rawJson, {
        originalProblem: problemSession.originalProblem,
        whatWasTried: ['Executed custom action steps and communicated clearly.'],
        whatWorked: ['Direct communication and focused prioritization.'],
        whatFailed: ['Initial lack of clarity and alignment.'],
        finalSolution: 'Successfully brought clarity and resolved the blocker.',
        lessonsLearned: ['Early alignment saves friction and time.'],
        resolvedAt: new Date().toISOString(),
      });

      return res.json({ resolution: parsed });
    } catch (err: any) {
      console.error('[AI Problem Resolve Error]:', err);
      return res.status(500).json({ error: 'Failed to generate problem resolution summary.' });
    }
  });

  // ==========================================
  // API ROUTE: AI Brainstorming Mode
  // ==========================================
  app.post('/api/ai/brainstorm', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { idea, language = 'en' } = body;

      if (!idea || typeof idea !== 'string') {
        return res.status(400).json({ error: 'Idea prompt is required.' });
      }

      const systemInstruction = `You are MindBridge Brainstorming Engine.
Expand the user's idea into rich multidisciplinary angles, innovative features, opportunities, risks, and an actionable blueprint.
Return a valid JSON object matching:
{
  "title": "Creative 3-6 word title for this brainstorming concept",
  "keyHighlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "angles": [
    {
      "title": "Core Product & User Experience",
      "category": "Product",
      "ideas": ["Specific creative feature 1", "Feature 2", "Feature 3"],
      "opportunities": ["Market or personal opportunity 1", "Opportunity 2"],
      "risks": ["Potential obstacle or pitfall 1"],
      "nextSteps": ["Immediate experiment to test this angle"]
    },
    {
      "title": "Differentiated / 10x Innovation Angle",
      "category": "Innovation",
      "ideas": ["Unconventional twist 1", "Twist 2"],
      "opportunities": ["Unique differentiator 1"],
      "risks": ["Complexity risk 1"],
      "nextSteps": ["Validation experiment"]
    },
    {
      "title": "Distribution & Momentum Angle",
      "category": "Growth",
      "ideas": ["Launch strategy 1", "Community tactic 2"],
      "opportunities": ["Leverage point"],
      "risks": ["Adoption friction"],
      "nextSteps": ["First outreach action"]
    }
  ],
  "actionPlan": [
    "Phase 1: Validate assumptions with 3 target people",
    "Phase 2: Build a minimal prototype or draft",
    "Phase 3: Launch first iteration and collect feedback"
  ]
}`;

      const prompt = `Idea to brainstorm:\n"${idea}"`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.7,
      });

      const parsed = parseSafeJson(rawJson, null);
      if (!parsed) throw new Error('Invalid brainstorm JSON response');

      return res.json({ result: parsed });
    } catch (err: any) {
      console.error('[AI Brainstorm Error]:', err);
      return res.status(500).json({ error: 'Failed to brainstorm ideas.' });
    }
  });

  // ==========================================
  // API ROUTE: Decision Assistant
  // ==========================================
  app.post('/api/ai/decision', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { dilemma, optionA, optionB, criteria = '', language = 'en' } = body;

      if (!dilemma) {
        return res.status(400).json({ error: 'Decision dilemma is required.' });
      }

      const systemInstruction = `You are MindBridge Decision Assistant.
Help the user make a thoughtful, balanced, objective decision between two options or paths.
Do NOT present AI recommendations as guaranteed or objectively infallible; phrase recommendations thoughtfully as possibilities to consider.
Return a valid JSON object matching:
{
  "optionAName": "${optionA || 'Option A'}",
  "optionBName": "${optionB || 'Option B'}",
  "factors": [
    {
      "factor": "Cost / Financial Impact",
      "optionAValue": "Analysis for Option A",
      "optionBValue": "Analysis for Option B",
      "importance": "High" | "Medium" | "Low"
    },
    {
      "factor": "Time & Effort Commitment",
      "optionAValue": "Analysis for Option A",
      "optionBValue": "Analysis for Option B",
      "importance": "High" | "Medium" | "Low"
    },
    {
      "factor": "Growth & Long-Term Value",
      "optionAValue": "Analysis for Option A",
      "optionBValue": "Analysis for Option B",
      "importance": "High" | "Medium" | "Low"
    },
    {
      "factor": "Flexibility & Reversibility",
      "optionAValue": "Analysis for Option A",
      "optionBValue": "Analysis for Option B",
      "importance": "High" | "Medium" | "Low"
    }
  ],
  "optionAPros": ["Major pro 1", "Major pro 2"],
  "optionACons": ["Major con 1", "Major con 2"],
  "optionBPros": ["Major pro 1", "Major pro 2"],
  "optionBCons": ["Major con 1", "Major con 2"],
  "tradeOffs": ["Key trade-off 1 (e.g., certainty vs growth potential)", "Key trade-off 2"],
  "recommendation": "Balanced recommendation weighing user priorities",
  "reflectiveQuestions": [
    "If you made this choice today and could not reverse it, which path feels more energizing?",
    "What would you advise a close friend in this exact dilemma?",
    "Which risk is easier for you to accept and manage?"
  ]
}`;

      const prompt = `Dilemma: "${dilemma}"
Option A: "${optionA || 'Option A'}"
Option B: "${optionB || 'Option B'}"
Specific Criteria / Context: "${criteria || 'None specified'}"`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      });

      const parsed = parseSafeJson(rawJson, null);
      if (!parsed) throw new Error('Invalid decision JSON response');

      return res.json({ result: parsed });
    } catch (err: any) {
      console.error('[AI Decision Error]:', err);
      return res.status(500).json({ error: 'Failed to generate decision analysis.' });
    }
  });

  // ==========================================
  // API ROUTE: Goal Breakdown Planner
  // ==========================================
  app.post('/api/ai/goal-breakdown', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { title, description = '', deadline = '', category = 'Personal', language = 'en' } = body;

      const systemInstruction = `You are MindBridge Goal Planning Engine.
Break down an ambitious personal or professional goal into a realistic sequence of milestones and actionable micro-tasks.
Return a valid JSON object matching:
{
  "suggestedDescription": "Enhanced SMART formulation of the goal",
  "milestones": [
    {
      "id": "ms_1",
      "title": "Milestone 1: Foundations & Preparation",
      "completed": false,
      "tasks": [
        { "id": "t_1_1", "title": "Specific foundational action item 1", "completed": false },
        { "id": "t_1_2", "title": "Specific foundational action item 2", "completed": false }
      ]
    },
    {
      "id": "ms_2",
      "title": "Milestone 2: Execution & Core Practice",
      "completed": false,
      "tasks": [
        { "id": "t_2_1", "title": "Execution task 1", "completed": false },
        { "id": "t_2_2", "title": "Execution task 2", "completed": false }
      ]
    },
    {
      "id": "ms_3",
      "title": "Milestone 3: Mastery & Delivery",
      "completed": false,
      "tasks": [
        { "id": "t_3_1", "title": "Final delivery task 1", "completed": false },
        { "id": "t_3_2", "title": "Review and celebratory reflection", "completed": false }
      ]
    }
  ]
}`;

      const prompt = `Goal: "${title}"\nDescription: "${description}"\nTarget Deadline: "${deadline}"\nCategory: "${category}"`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      });

      const parsed = parseSafeJson(rawJson, null);
      if (!parsed) throw new Error('Invalid goal breakdown JSON response');

      return res.json({ result: parsed });
    } catch (err: any) {
      console.error('[AI Goal Breakdown Error]:', err);
      return res.status(500).json({ error: 'Failed to break down goal.' });
    }
  });

  // ==========================================
  // API ROUTE: Daily Reflection Summary
  // ==========================================
  app.post('/api/ai/daily-reflection', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { userActivities = [], date = new Date().toISOString().split('T')[0] } = body;

      const systemInstruction = `You are MindBridge Daily Reflection Generator.
Synthesize the user's activities, journal notes, problems addressed, and completed tasks into an empowering daily summary.
Return a valid JSON object matching:
{
  "workedOn": ["Key focus area 1", "Key focus area 2"],
  "problemsEncountered": ["Challenge handled or noted"],
  "progressMade": ["Meaningful milestone or action taken"],
  "tomorrowPriorities": ["Recommended priority 1", "Priority 2"],
  "overallReflection": "3-4 sentence warm, thoughtful perspective on the day's momentum."
}`;

      const prompt = `Date: ${date}\nUser Activity Data:\n${JSON.stringify(userActivities, null, 2)}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
      });

      const parsed = parseSafeJson(rawJson, {
        workedOn: ['Self-reflection and priority alignment.'],
        problemsEncountered: ['Navigating daily tasks with intentionality.'],
        progressMade: ['Engaged with MindBridge workspace.'],
        tomorrowPriorities: ['Focus on highest leverage action items.'],
        overallReflection: 'A productive day of conscious thought, steady effort, and clear focus.',
      });

      return res.json({ summary: parsed });
    } catch (err: any) {
      console.error('[AI Daily Reflection Error]:', err);
      return res.status(500).json({ error: 'Failed to generate daily reflection.' });
    }
  });

  // ==========================================
  // API ROUTE: Weekly Review
  // ==========================================
  app.post('/api/ai/weekly-review', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { weeklyData = {} } = body;

      const systemInstruction = `You are MindBridge Weekly Review Synthesizer.
Review the user's past week of reflections, solved problems, and goal accomplishments.
Return a valid JSON object matching:
{
  "accomplishments": ["Major accomplishment 1", "Accomplishment 2"],
  "challenges": ["Key challenge or hurdle faced"],
  "goalsProgressed": ["Goal milestone moved forward"],
  "recurringPatterns": ["Noticed positive or limiting pattern"],
  "keyLessons": ["Useful lesson to carry into next week"],
  "suggestedPriorities": ["Strategic priority for the upcoming week 1", "Priority 2"]
}`;

      const prompt = `Weekly Data Overview:\n${JSON.stringify(weeklyData, null, 2)}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
      });

      const parsed = parseSafeJson(rawJson, {
        accomplishments: ['Maintained consistent reflection practice.'],
        challenges: ['Balancing deadlines with mental clarity.'],
        goalsProgressed: ['Active progress across ongoing goals.'],
        recurringPatterns: ['Clarity emerges whenever problems are broken down systematically.'],
        keyLessons: ['Action cures anxiety; break big tasks into 15-minute steps.'],
        suggestedPriorities: ['Set clear weekly boundaries', 'Execute top priority goal milestones.'],
      });

      return res.json({ review: parsed });
    } catch (err: any) {
      console.error('[AI Weekly Review Error]:', err);
      return res.status(500).json({ error: 'Failed to generate weekly review.' });
    }
  });

  // ==========================================
  // API ROUTE: Semantic Smart Search
  // ==========================================
  app.post('/api/ai/smart-search', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { queryText, documents = [] } = body;

      if (!queryText) {
        return res.status(400).json({ error: 'Search query is required.' });
      }

      const systemInstruction = `You are MindBridge Semantic Search Ranker.
Given a user query (which might be semantic like "times I was struggling with communication"), rank and identify the most relevant document IDs from the provided candidate list.
Return a valid JSON object:
{
  "matches": [
    {
      "id": "document_id",
      "relevanceScore": 0.95,
      "matchReason": "Why this document corresponds to the user's search intent"
    }
  ]
}`;

      const candidateDocs = documents.slice(0, 40).map((d: any) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        textSample: (d.text || d.summary || d.problem || '').substring(0, 250),
      }));

      const prompt = `User Search Query: "${queryText}"\nCandidate Documents:\n${JSON.stringify(candidateDocs, null, 2)}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      });

      const parsed = parseSafeJson(rawJson, { matches: [] });
      return res.json(parsed);
    } catch (err: any) {
      console.error('[AI Search Error]:', err);
      return res.status(500).json({ error: 'Failed to execute smart search.' });
    }
  });

  // ==========================================
  // API ROUTE: Proactive Insights Scanner
  // ==========================================
  app.post('/api/ai/proactive-scan', verifyFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object') ? req.body : {};
      const { recentData = {} } = body;

      const systemInstruction = `You are MindBridge Proactive Insight Assistant.
Analyze recent user goals, unsolved problem sessions, and reflection entries.
Generate 1 or 2 polite, highly valuable proactive suggestions (e.g., an upcoming deadline reminder, a suggestion to follow up on an ongoing problem, or a helpful reflection prompt).
Do NOT be intrusive or spammy.
Return a valid JSON object matching:
{
  "suggestions": [
    {
      "id": "sug_1",
      "type": "goal_reminder" | "deadline" | "problem_followup" | "pattern_detected" | "daily_prompt",
      "title": "Short title",
      "description": "Thoughtful, helpful 1-2 sentence proposal or encouragement",
      "actionLabel": "Button CTA label (e.g., 'Update Problem', 'Review Goal', 'Create 3-Day Plan')",
      "actionType": "open_goal" | "open_problem" | "open_journal" | "generate_plan",
      "actionTargetId": "id of related goal or problem if applicable"
    }
  ]
}`;

      const prompt = `User State Context:\n${JSON.stringify(recentData, null, 2)}`;

      const rawJson = await generateWithFallback(prompt, {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.4,
      });

      const parsed = parseSafeJson(rawJson, { suggestions: [] });
      return res.json(parsed);
    } catch (err: any) {
      console.error('[AI Proactive Scan Error]:', err);
      return res.status(500).json({ suggestions: [] });
    }
  });

  // ==========================================
  // Vite Integration & Static Serving
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[MindBridge AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
