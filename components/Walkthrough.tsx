import React, { useEffect, useState } from 'react';
import { TourStep, Language } from '../types';
import { t } from '../utils/i18n';

interface WalkthroughProps {
  steps: TourStep[];
  isActive: boolean;
  onClose: () => void;
  lang: Language;
}

export const Walkthrough: React.FC<WalkthroughProps> = ({ steps, isActive, onClose, lang }) => {
  const [index, setIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!isActive) {
      setIndex(0);
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const step = steps[index];
      const el = document.querySelector(step.selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = el.getBoundingClientRect();
        // Simple positioning logic
        let top = rect.bottom + 12 + window.scrollY;
        let left = rect.left + window.scrollX;
        
        // Ensure not off screen right
        if (left + 300 > window.innerWidth) {
            left = window.innerWidth - 320;
        }

        setCoords({ top, left });
        
        // Add highlight
        document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight', 'ring-2', 'ring-accent', 'ring-offset-2'));
        el.classList.add('tour-highlight', 'ring-2', 'ring-accent', 'ring-offset-2');
      }
    };

    // Small delay to allow DOM updates
    setTimeout(updatePosition, 300);

    return () => {
       document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight', 'ring-2', 'ring-accent', 'ring-offset-2'));
    };
  }, [isActive, index, steps]);

  if (!isActive || !coords) return null;

  return (
    <div className="absolute z-50 w-80 bg-white rounded-xl shadow-2xl p-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
         style={{ top: coords.top, left: coords.left }}>
      <p className="text-xs text-slate-800 mb-4 leading-relaxed">{steps[index].text}</p>
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="text-[10px] text-slate-400 hover:text-slate-600">{t(lang, 'skip')}</button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400">{index + 1} / {steps.length}</span>
          <button 
            onClick={() => {
                if (index < steps.length - 1) setIndex(index + 1);
                else onClose();
            }}
            className="rounded-lg bg-accent text-white text-[11px] px-3 py-1.5 hover:bg-accent/90 transition"
          >
            {index < steps.length - 1 ? t(lang, 'next') + ' →' : t(lang, 'finish')}
          </button>
        </div>
      </div>
    </div>
  );
};