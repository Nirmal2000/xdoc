"use client"

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QUICK_TASK_PROMPTS } from '@/lib/quick-tasks';

export default function QuickTasks({ setPrompt, onQuickTaskSubmit, userInfo }) {
  const params = useParams();
  const experienceId = params?.experienceId;
  const tweetsUrl = '/tweets';
  return (
    <div className="mx-auto max-w-3xl w-full text-left px-6">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Tasks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            className="relative overflow-hidden cursor-pointer group"
            style={{ borderRadius: '1.27rem' }}
            onClick={() => {
              const prompt = QUICK_TASK_PROMPTS[0];
              if (onQuickTaskSubmit) {
                onQuickTaskSubmit(prompt);
              } else {
                setPrompt(prompt);
              }
            }}
          >
            <img src="/eval.png" alt="Evaluate your X" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
            <div className="absolute bottom-4 left-4 text-white font-semibold">
              Evaluate your X
            </div>
          </div>
          <div
            className="relative overflow-hidden cursor-pointer group"
            style={{ borderRadius: '1.27rem' }}
            onClick={() => {
              const prompt = QUICK_TASK_PROMPTS[1];
              if (onQuickTaskSubmit) {
                onQuickTaskSubmit(prompt);
              } else {
                setPrompt(prompt);
              }
            }}
          >
            <img src="/persona.png" alt="Create Persona" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
            <div className="absolute bottom-4 left-4 text-white font-semibold">
              Create Persona
            </div>
          </div>
          <div
            className="relative overflow-hidden cursor-pointer group"
            style={{ borderRadius: '1.27rem' }}
            onClick={() => {
              const prompt = QUICK_TASK_PROMPTS[2];
              if (onQuickTaskSubmit) {
                onQuickTaskSubmit(prompt);
              } else {
                setPrompt(prompt);
              }
            }}
          >
            <img src="/viraltweet.png" alt="Create Viral X" className="w-full h-auto" style={{ borderRadius: '1.27rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '1.27rem' }}></div>
            <div className="absolute bottom-4 left-4 text-white font-semibold">
              Create Viral X
            </div>
          </div>          
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">Coming Soon</h2>
        <div className="custom-scrollbar flex space-x-2 overflow-x-auto pb-4">
          <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
            <img src="/hastag.png" alt="tag Research" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
            <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
              Hashtag Search
            </div>
          </div>
          <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
            <img src="/niche.png" alt="Niche News" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
            <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
              Niche News
            </div>
          </div>
          <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>
            <img src="/shadowban.png" alt="Shadowban Check" className="w-full h-full object-cover" style={{ borderRadius: '0.8rem' }} />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors" style={{ borderRadius: '0.8rem' }}></div>
            <div className="absolute bottom-2 left-2 text-white text-xs font-semibold">
              Shadowban Check
            </div>
          </div>
          <div className="flex-shrink-0 w-36 h-24 relative overflow-hidden cursor-pointer group" style={{ borderRadius: '0.8rem' }}>            
          </div>
        </div>
      </div>
    </div>
  );
}
