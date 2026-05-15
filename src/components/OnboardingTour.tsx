import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetId: string;
}

const steps: TourStep[] = [
  { title: "Welcome to Rectech 🚀", description: "Let's take a quick tour to help you understand how to use the platform.", targetId: "sidebar-nav" },
  { title: "Sidebar Navigation", description: "This is your main navigation menu. Access Dashboard, Candidates, Shortlist, Insights, Chat, and Profile.", targetId: "sidebar-nav" },
  { title: "Dashboard Overview", description: "Your dashboard gives a real-time overview of candidates, activity, and progress.", targetId: "dashboard-home-container" },
  { title: "Upload CV", description: "Upload CVs directly from the sidebar. Our system will automatically parse and extract candidate data.", targetId: "sidebar-upload-area" },
  { title: "Candidates Section", description: "View all parsed candidates and manage them effectively.", targetId: "nav-candidates" },
  { title: "Boolean Search", description: "Use Boolean search to find candidates quickly. e.g., React AND Node NOT Java.", targetId: "search-input" },
  { title: "Shortlist Workflow", description: "Shortlist candidates to mark them as preferred for hiring.", targetId: "nav-shortlist" },
  { title: "Talent Insights", description: "Use insights to analyze hiring trends and team activity.", targetId: "nav-analytics" },
  { title: "Chat Collaboration", description: "Collaborate with your team using real-time messaging.", targetId: "nav-chat" },
  { title: "Profile Settings", description: "Update your profile and notification preferences here.", targetId: "nav-profile" },
  { title: "You're all set 🎉", description: "Start uploading CVs and building your talent pipeline.", targetId: "nav-home" },
];

export default function OnboardingTour({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = steps[stepIndex];
  const targetElement = document.getElementById(currentStep.targetId);

  const nextStep = () => {
    if (stepIndex < steps.length - 1) setStepIndex(stepIndex + 1);
    else onClose();
  };

  const backStep = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="bg-[var(--card-bg)] p-6 rounded-3xl shadow-2xl border border-[var(--border-color)] max-w-sm w-full pointer-events-auto animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={18} />
        </button>
        <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{currentStep.description}</p>
        <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)] font-bold">Step {stepIndex + 1} of {steps.length}</span>
            <div className="flex gap-2">
                {stepIndex > 0 && <button onClick={backStep} className="px-4 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--sidebar-bg)]">Back</button>}
                <button onClick={nextStep} className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700">{stepIndex === steps.length - 1 ? 'Finish' : 'Next'}</button>
            </div>
        </div>
      </div>
    </div>
  );
}
