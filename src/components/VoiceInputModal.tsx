import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Check, X, Volume2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptionConfirmed: (text: string) => void;
  title?: string;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  onTranscriptionConfirmed,
  title = 'Voice Reflection',
}) => {
  const { t, language } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setError(null);
      return;
    }

    // Check Web Speech API availability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not natively supported by your browser. You can still type your thoughts.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'hinglish' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('[Speech] Error:', event.error);
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else {
          setError(`Speech error: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      startListening();
    } catch (err: any) {
      setError('Could not initialize speech recognition.');
    }

    return () => {
      stopListening();
    };
  }, [isOpen, language]);

  const startListening = () => {
    setError(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        // already started
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsRecording(false);
  };

  const handleConfirm = () => {
    if (transcript.trim()) {
      onTranscriptionConfirmed(transcript.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-800 dark:text-slate-100"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-500 rounded-xl border border-rose-200/40 dark:border-rose-800/40">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isRecording ? t.listening : 'Review and edit before sending'}
              </p>
            </div>
          </div>
          <button
            id="btn-voice-modal-close"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Animated Waveform Indicator */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <motion.div
                animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                className="absolute w-24 h-24 rounded-full bg-rose-500/20"
              />
            )}
            <button
              id="btn-toggle-recording"
              onClick={isRecording ? stopListening : startListening}
              className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-md ${
                isRecording
                  ? 'bg-rose-500 text-white hover:bg-rose-600 scale-105'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isRecording ? <Mic className="w-7 h-7 animate-pulse" /> : <MicOff className="w-7 h-7" />}
            </button>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-3">
            {isRecording ? t.stopSpeaking : t.startSpeaking}
          </p>
        </div>

        {error ? (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        ) : null}

        {/* Editable Transcription Area */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Transcribed Text (Editable):
          </label>
          <textarea
            id="voice-transcription-input"
            rows={4}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Speak now or type to edit transcribed thoughts..."
            className="w-full p-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            id="btn-voice-cancel"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            id="btn-voice-confirm"
            onClick={handleConfirm}
            disabled={!transcript.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Check className="w-4 h-4" />
            Use Transcribed Text
          </button>
        </div>
      </motion.div>
    </div>
  );
};
