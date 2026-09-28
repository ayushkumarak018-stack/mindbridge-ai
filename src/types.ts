export type AppLanguage = 'en' | 'hi' | 'hinglish';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  language: AppLanguage;
  memoryEnabled: boolean;
  proactiveInsightsEnabled: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExtractedIntelligence {
  mainTopic?: string;
  keyPoints?: string[];
  problem?: string;
  goal?: string;
  importantDecisions?: string[];
  actionItems?: string[];
  summary?: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  pinned: boolean;
  messages: JournalMessage[];
  summary?: string;
  intelligence?: ExtractedIntelligence;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SolutionOption {
  id: string;
  title: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  risks: string[];
  difficulty: 'Easy' | 'Moderate' | 'High' | 'Expert';
  expectedResult: string;
}

export interface ActionStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
}

export interface ProblemAnalysis {
  mainProblem: string;
  rootCauses: string[];
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  impact: string;
  inUserControl: string[];
  outsideUserControl: string[];
  recommendationExplanation: string;
}

export interface ProblemUpdate {
  id: string;
  timestamp: string;
  userNote: string;
  aiResponse: string;
  strategyAdjustment?: string;
}

export interface ProblemResolution {
  originalProblem: string;
  whatWasTried: string[];
  whatWorked: string[];
  whatFailed: string[];
  finalSolution: string;
  lessonsLearned: string[];
  resolvedAt: string;
}

export interface ProblemSession {
  id: string;
  title: string;
  category: string;
  status: 'analyzing' | 'in_progress' | 'solved';
  originalProblem: string;
  analysis?: ProblemAnalysis;
  solutions: SolutionOption[];
  recommendedSolutionId?: string;
  selectedSolutionId?: string;
  actionPlan: ActionStep[];
  updates: ProblemUpdate[];
  resolution?: ProblemResolution;
  createdAt: string;
  updatedAt: string;
}

export interface BrainstormAngle {
  title: string;
  category: string;
  ideas: string[];
  opportunities: string[];
  risks: string[];
  nextSteps: string[];
}

export interface BrainstormSession {
  id: string;
  title: string;
  originalIdea: string;
  angles: BrainstormAngle[];
  keyHighlights: string[];
  actionPlan?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DecisionFactor {
  factor: string;
  optionAValue: string;
  optionBValue: string;
  importance: 'High' | 'Medium' | 'Low';
  factorName?: string;
  scores?: Record<string, number>;
}

export interface OptionDetail {
  id: string;
  name: string;
  pros: string[];
  cons: string[];
  score?: number;
}

export type ComparisonFactor = DecisionFactor;

export interface DecisionSession {
  id: string;
  title?: string;
  dilemma: string;
  optionAName?: string;
  optionBName?: string;
  options?: OptionDetail[];
  factors: DecisionFactor[];
  optionAPros?: string[];
  optionACons?: string[];
  optionBPros?: string[];
  optionBCons?: string[];
  tradeOffs: string[];
  recommendation: string;
  reflectiveQuestions?: string[];
  userChosenOption?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetDate?: string;
  completed: boolean;
  tasks: GoalTask[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High';
  deadline: string;
  progressPercentage: number;
  completed: boolean;
  completedAt?: string;
  milestones: GoalMilestone[];
  createdAt: string;
  updatedAt: string;
}

export interface AIMemory {
  id: string;
  keyTopic: string;
  content: string;
  category: 'Goal' | 'Preference' | 'Problem' | 'Habit' | 'Value' | 'General';
  sourceType: 'journal' | 'problem' | 'goal' | 'decision';
  sourceId?: string;
  timestamp: string;
}

export interface DailySummary {
  id: string;
  date: string;
  theme?: string;
  emotionalTone?: string;
  keyReflection?: string;
  workedOn?: string[];
  problemsEncountered?: string[];
  progressMade?: string[];
  tomorrowPriorities?: string[];
  overallReflection?: string;
  wins?: string[];
  dailyWins?: string[];
  keyReflections?: string[];
  focusForTomorrow?: string[];
  growthOpportunity?: string;
  actionPrompt?: string;
  createdAt: string;
}

export type DailyInsight = DailySummary;

export interface WeeklyReview {
  id: string;
  weekRange?: string;
  weekStartDate?: string;
  weekEndDate?: string;
  summary?: string;
  accomplishments?: string[];
  topAccomplishments?: string[];
  challenges?: string[];
  recurringChallenges?: string[];
  goalsProgressed?: string[];
  mindsetPatterns?: string[];
  recurringPatterns?: string[];
  keyLessons?: string[];
  suggestedPriorities?: string[];
  nextWeekPriorities?: string[];
  createdAt: string;
}

export type WeeklyInsight = WeeklyReview;

export interface ProactiveSuggestion {
  id: string;
  type: 'goal_reminder' | 'deadline' | 'problem_followup' | 'pattern_detected' | 'daily_prompt';
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'open_goal' | 'open_problem' | 'open_journal' | 'generate_plan';
  actionTargetId?: string;
  dismissed: boolean;
  createdAt: string;
}

export interface UserStats {
  problemsSolved: number;
  activeProblems: number;
  activeGoals: number;
  completedGoals: number;
  reflectionsCount: number;
  decisionsCount: number;
  brainstormsCount: number;
  resolutionRate: number;
}
