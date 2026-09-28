import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppLanguage } from '../types';
import { useAuth } from './AuthContext';

export interface Translations {
  appName: string;
  tagline: string;
  getStarted: string;
  signInWithGoogle: string;
  exploreAsGuest: string;
  welcome: string;
  howCanIHelp: string;
  newReflection: string;
  solveProblem: string;
  brainstormIdeas: string;
  makeDecision: string;
  workOnGoal: string;
  reviewProgress: string;
  dashboard: string;
  journal: string;
  problemSolver: string;
  goals: string;
  decisions: string;
  brainstorm: string;
  insights: string;
  history: string;
  memoryPrivacy: string;
  signOut: string;
  activeGoals: string;
  problemsSolved: string;
  reflections: string;
  resolutionRate: string;
  voiceInput: string;
  listening: string;
  startSpeaking: string;
  stopSpeaking: string;
  save: string;
  cancel: string;
  delete: string;
  send: string;
  typeMessage: string;
  languageSelect: string;
  threatModelNotice: string;
}

const translationsMap: Record<AppLanguage, Translations> = {
  en: {
    appName: 'MindBridge AI',
    tagline: 'Your Intelligent Personal Reflection & Real-Time Problem-Solving Companion',
    getStarted: 'Get Started',
    signInWithGoogle: 'Sign in with Google',
    exploreAsGuest: 'Explore Instant Guest Mode',
    welcome: 'Good day',
    howCanIHelp: 'How can I help you think through things today?',
    newReflection: 'New Reflection',
    solveProblem: 'Solve a Problem',
    brainstormIdeas: 'Brainstorm Ideas',
    makeDecision: 'Make a Decision',
    workOnGoal: 'Work on a Goal',
    reviewProgress: 'Review My Progress',
    dashboard: 'Dashboard',
    journal: 'AI Journal',
    problemSolver: 'Problem Solver',
    goals: 'Goals',
    decisions: 'Decision Assistant',
    brainstorm: 'Brainstorming',
    insights: 'Daily & Weekly Insights',
    history: 'History & Search',
    memoryPrivacy: 'AI Memory & Privacy',
    signOut: 'Sign Out',
    activeGoals: 'Active Goals',
    problemsSolved: 'Problems Solved',
    reflections: 'Reflections',
    resolutionRate: 'Resolution Rate',
    voiceInput: 'Voice Reflection',
    listening: 'Listening to your thoughts...',
    startSpeaking: 'Start Speaking',
    stopSpeaking: 'Done Speaking',
    save: 'Save & Continue',
    cancel: 'Cancel',
    delete: 'Delete',
    send: 'Send to AI',
    typeMessage: 'Reflect on what is on your mind...',
    languageSelect: 'Language',
    threatModelNotice: 'Security & Threat Model',
  },
  hi: {
    appName: 'माइंडब्रिज एआई',
    tagline: 'आपका व्यक्तिगत चिंतन एवं रियल-टाइम समस्या समाधान साथी',
    getStarted: 'शुरू करें',
    signInWithGoogle: 'Google से साइन इन करें',
    exploreAsGuest: 'गेस्ट मोड में देखें',
    welcome: 'नमस्ते',
    howCanIHelp: 'आज मैं आपकी किस प्रकार सहायता कर सकता हूँ?',
    newReflection: 'नया चिंतन',
    solveProblem: 'समस्या का समाधान करें',
    brainstormIdeas: 'विचार मंथन (Brainstorm)',
    makeDecision: 'निर्णय लें',
    workOnGoal: 'लक्ष्य पर काम करें',
    reviewProgress: 'प्रगति की समीक्षा करें',
    dashboard: 'डैशबोर्ड',
    journal: 'एआई जर्नल',
    problemSolver: 'समस्या समाधान',
    goals: 'लक्ष्य',
    decisions: 'निर्णय सहायक',
    brainstorm: 'विचार मंथन',
    insights: 'दैनिक व साप्ताहिक समीक्षा',
    history: 'इतिहास व खोज',
    memoryPrivacy: 'मेमोरी व प्राइवेसी',
    signOut: 'साइन आउट',
    activeGoals: 'सक्रिय लक्ष्य',
    problemsSolved: 'सुलझाई गई समस्याएं',
    reflections: 'चिंतन सत्र',
    resolutionRate: 'सफलता दर',
    voiceInput: 'वॉइस इनपुट',
    listening: 'आपकी आवाज़ सुनी जा रही है...',
    startSpeaking: 'बोलना शुरू करें',
    stopSpeaking: 'समाप्त करें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    send: 'भेजें',
    typeMessage: 'अपने विचार यहाँ लिखें...',
    languageSelect: 'भाषा',
    threatModelNotice: 'सुरक्षा और थ्रेट मॉडल',
  },
  hinglish: {
    appName: 'MindBridge AI',
    tagline: 'Aapka Personal AI Companion - Reflection aur Real-Time Problem Solving ke liye',
    getStarted: 'Get Started Karein',
    signInWithGoogle: 'Google se Sign In Karein',
    exploreAsGuest: 'Instant Guest Mode Try Karein',
    welcome: 'Namaste',
    howCanIHelp: 'Aaj hum kis topic par deeply discuss karein?',
    newReflection: 'New Reflection',
    solveProblem: 'Problem Solve Karein',
    brainstormIdeas: 'Ideas Brainstorm Karein',
    makeDecision: 'Smart Decision Lein',
    workOnGoal: 'Goal Par Kaam Karein',
    reviewProgress: 'Progress Review Karein',
    dashboard: 'Dashboard',
    journal: 'AI Journal',
    problemSolver: 'Problem Solver',
    goals: 'Goals',
    decisions: 'Decision Assistant',
    brainstorm: 'Brainstorming',
    insights: 'Daily/Weekly Insights',
    history: 'History & Search',
    memoryPrivacy: 'AI Memory & Privacy',
    signOut: 'Sign Out',
    activeGoals: 'Active Goals',
    problemsSolved: 'Problems Solved',
    reflections: 'Reflections',
    resolutionRate: 'Resolution Rate',
    voiceInput: 'Voice Reflection',
    listening: 'Sun rahe hain, boliye...',
    startSpeaking: 'Bolna Shuru Karein',
    stopSpeaking: 'Done',
    save: 'Save Karein',
    cancel: 'Cancel',
    delete: 'Delete',
    send: 'Send Karein',
    typeMessage: 'Jo bhi dimaag me chal raha hai, yahan share karein...',
    languageSelect: 'Language',
    threatModelNotice: 'Security & Threat Model',
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updateProfileSettings } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    if (profile?.language && profile.language !== language) {
      setLanguageState(profile.language);
    }
  }, [profile?.language]);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    if (profile) {
      updateProfileSettings({ language: lang }).catch(() => {});
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translationsMap[language] || translationsMap.en,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
