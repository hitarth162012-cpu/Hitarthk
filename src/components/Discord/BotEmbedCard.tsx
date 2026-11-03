import React from 'react';
import { BotCardData } from '../../types';
import { sound } from '../../utils/audioSynth';

interface BotEmbedCardProps {
  card: BotCardData;
  onRunCommand?: (cmd: string) => void;
}

export const BotEmbedCard: React.FC<BotEmbedCardProps> = ({ card, onRunCommand }) => {
  return (
    <div
      className="mt-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden max-w-xl text-xs font-sans transition-all"
      style={{ borderLeft: `4px solid ${card.color || '#8b5cf6'}` }}
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* Author Header */}
        {card.author && (
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
            {card.author.icon && <span className="text-sm">{card.author.icon}</span>}
            <span className="uppercase tracking-wider font-mono">{card.author.name}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 font-mono">
              BOT EMBED
            </span>
          </div>
        )}

        {/* Title & Subtitle */}
        <div className="space-y-0.5">
          <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span>{card.title}</span>
          </h4>
          {card.subtitle && (
            <p className="text-xs text-slate-400 font-medium">{card.subtitle}</p>
          )}
        </div>

        {/* Fields Grid */}
        {card.fields && card.fields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {card.fields.map((field, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 ${
                  field.inline === false ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {field.label}
                </div>
                <div className="text-xs font-medium text-slate-200 whitespace-pre-line leading-relaxed">
                  {field.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar (e.g. for level or health) */}
        {card.progress && (
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400">
              <span>{card.progress.label}</span>
              <span className="font-bold text-amber-400">
                {card.progress.current} / {card.progress.max}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (card.progress.current / card.progress.max) * 100)}%`,
                  backgroundColor: card.color || '#8b5cf6',
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {card.actions && card.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {card.actions.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  sound.playSlotTick();
                  if (act.command && onRunCommand) {
                    onRunCommand(act.command);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  act.style === 'primary'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    : act.style === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    : act.style === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {act.label}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        {card.footer && (
          <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center justify-between">
            <span>{card.footer}</span>
            <span className="font-mono text-slate-500">HITARTH BOT</span>
          </div>
        )}
      </div>
    </div>
  );
};
