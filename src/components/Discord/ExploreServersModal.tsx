import React from 'react';
import { ChatServer } from '../../types';
import { sound } from '../../utils/audioSynth';
import { Compass, Users, Sparkles, Check, X } from 'lucide-react';

interface ExploreServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: ChatServer[];
  onSelectServer: (serverId: string) => void;
}

export const ExploreServersModal: React.FC<ExploreServersModalProps> = ({
  isOpen,
  onClose,
  servers,
  onSelectServer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <span>Explore HITARTH Servers</span>
            </h3>
            <p className="text-xs text-slate-400">Discover and join active game bot communities.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {servers.map((server) => (
            <div
              key={server.id}
              className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                  {server.icon}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white">{server.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-1">{server.description}</p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {server.channels.length} channels available
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playJackpot();
                  onSelectServer(server.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer shrink-0"
              >
                Enter Server
              </button>
            </div>
          ))}
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white font-medium"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
