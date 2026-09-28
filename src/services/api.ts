import { auth } from '../firebase';
import { 
  JournalMessage, 
  AIMemory, 
  ExtractedIntelligence, 
  ProblemSession, 
  ProblemAnalysis, 
  BrainstormSession, 
  DecisionSession, 
  DailySummary, 
  WeeklyReview, 
  ProactiveSuggestion,
  AppLanguage 
} from '../types';

async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      headers['x-client-uid'] = currentUser.uid;
      if (currentUser.email) {
        headers['x-client-email'] = currentUser.email;
      }
    } catch (err) {
      console.warn('[API] Could not fetch ID token, using client UID:', err);
      headers['x-client-uid'] = currentUser.uid;
    }
  } else {
    // For local demo guest or unauthenticated state
    const localGuestUid = typeof window !== 'undefined' ? localStorage.getItem('mindbridge_guest_uid') : null;
    headers['x-client-uid'] = localGuestUid || 'demo_user';
  }

  return headers;
}

export const api = {
  async postReflection(
    messages: JournalMessage[], 
    language: AppLanguage = 'en', 
    memories: AIMemory[] = [],
    userContext: any = {}
  ): Promise<{ reply: string }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/reflection', {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, language, memories, userContext }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate reflection response.');
    }
    return res.json();
  },

  async extractIntelligence(
    conversationText: string, 
    language: AppLanguage = 'en'
  ): Promise<{ intelligence: ExtractedIntelligence }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/intelligence', {
      method: 'POST',
      headers,
      body: JSON.stringify({ conversationText, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to extract intelligence.');
    }
    return res.json();
  },

  async solveProblem(
    problemDescription: string, 
    category: string = 'General', 
    language: AppLanguage = 'en', 
    memories: AIMemory[] = []
  ): Promise<{ result: any }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/problem-solve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemDescription, category, language, memories }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to analyze and solve problem.');
    }
    return res.json();
  },

  async updateProblem(
    problemSession: ProblemSession, 
    userNote: string, 
    language: AppLanguage = 'en'
  ): Promise<{ result: { aiResponse: string; strategyAdjustment: string; updatedActionPlan: any[] } }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/problem-update', {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemSession, userNote, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to process problem update.');
    }
    return res.json();
  },

  async resolveProblem(
    problemSession: ProblemSession, 
    language: AppLanguage = 'en'
  ): Promise<{ resolution: any }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/problem-resolve', {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemSession, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate resolution summary.');
    }
    return res.json();
  },

  async brainstormIdea(
    idea: string, 
    language: AppLanguage = 'en'
  ): Promise<{ result: any }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/brainstorm', {
      method: 'POST',
      headers,
      body: JSON.stringify({ idea, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to brainstorm ideas.');
    }
    return res.json();
  },

  async decideAssistant(
    dilemma: string, 
    optionA: string, 
    optionB: string, 
    criteria?: string, 
    language: AppLanguage = 'en'
  ): Promise<{ result: any }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/decision', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dilemma, optionA, optionB, criteria, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate decision analysis.');
    }
    return res.json();
  },

  // Alias for DecisionPage
  async analyzeDecision(
    title: string,
    dilemma: string,
    options: { id: string; name: string }[],
    context?: string,
    language: AppLanguage = 'en'
  ): Promise<{
    recommendation: string;
    tradeOffs: string[];
    factors: any[];
    options: any[];
  }> {
    const optionA = options[0]?.name || 'Option A';
    const optionB = options[1]?.name || 'Option B';
    const res = await this.decideAssistant(dilemma || title, optionA, optionB, context, language);
    const r = res.result || {};
    return {
      recommendation: r.recommendation || 'Evaluate options carefully.',
      tradeOffs: r.tradeOffs || [],
      factors: r.factors || [],
      options: [
        { id: '1', name: optionA, pros: r.optionAPros || [], cons: r.optionACons || [] },
        { id: '2', name: optionB, pros: r.optionBPros || [], cons: r.optionBCons || [] },
      ],
    };
  },

  async breakdownGoal(
    title: string, 
    description: string, 
    deadline: string, 
    category: string, 
    language: AppLanguage = 'en'
  ): Promise<{ result: any; milestones?: any[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/goal-breakdown', {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, description, deadline, category, language }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to break down goal.');
    }
    const data = await res.json();
    return {
      result: data.result,
      milestones: data.result?.milestones || [],
    };
  },

  async getDailyReflection(
    userActivities: any[], 
    date?: string
  ): Promise<{ summary: DailySummary }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/daily-reflection', {
      method: 'POST',
      headers,
      body: JSON.stringify({ userActivities, date }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate daily reflection.');
    }
    return res.json();
  },

  // Alias for InsightsPage
  async generateDailyInsight(
    userActivities: any[],
    date?: string
  ): Promise<DailySummary> {
    const res = await this.getDailyReflection(userActivities, date);
    return res.summary;
  },

  async getWeeklyReview(
    weeklyData: any
  ): Promise<{ review: WeeklyReview }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/weekly-review', {
      method: 'POST',
      headers,
      body: JSON.stringify({ weeklyData }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to generate weekly review.');
    }
    return res.json();
  },

  // Alias for InsightsPage
  async generateWeeklyReview(
    weeklyData: any
  ): Promise<WeeklyReview> {
    const res = await this.getWeeklyReview(weeklyData);
    return res.review;
  },

  async smartSearch(
    queryText: string, 
    documents: any[]
  ): Promise<{ matches: { id: string; relevanceScore: number; matchReason: string }[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/smart-search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ queryText, documents }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to execute smart search.');
    }
    return res.json();
  },

  // Alias for HistorySearchPage
  async smartSemanticSearch(
    query: string,
    candidates: { id: string; text: string }[]
  ): Promise<{ matchingIds: string[] }> {
    try {
      const res = await this.smartSearch(query, candidates.map((c) => ({ id: c.id, content: c.text })));
      return {
        matchingIds: (res.matches || []).map((m) => m.id),
      };
    } catch {
      return { matchingIds: [] };
    }
  },

  async scanProactiveInsights(
    recentData: any
  ): Promise<{ suggestions: ProactiveSuggestion[] }> {
    const headers = await getHeaders();
    const res = await fetch('/api/ai/proactive-scan', {
      method: 'POST',
      headers,
      body: JSON.stringify({ recentData }),
    });
    if (!res.ok) {
      return { suggestions: [] };
    }
    return res.json();
  },
};
