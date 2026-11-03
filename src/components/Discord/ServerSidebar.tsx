import React from 'react';
import { ChatServer, UserAccount } from '../../types';
import { sound } from '../../utils/audioSynth';
import {
  Compass,
  MessageSquare,
  Code2,
  Mic,
  MicOff,
  Headphones,
  Settings,
  Crown,
  Sparkles,
} from 'lucide-react';

interface ServerSidebarProps {
  servers: ChatServer[];
  activeServerId: string;
  activeView: 'chat' | 'dms' | 'dev_studio';
  account: UserAccount | null;
  onSelectServer: (serverId: string) => void;
  onSelectDMs: () => void;
  onSelectDevStudio: () => void;
  onOpenExplore: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  servers,
  activeServerId,
  activeView,
  account,
  onSelectServer,
  onSelectDMs,
  onSelectDevStudio,
  onOpenExplore,
  onOpenSettings,
  isMuted,
  onToggleMute,
}) => {
  const isDeveloper =
    account?.isDeveloper ||
    account?.id === 'OWO-9850' ||
    account?.inGameName.toLowerCase() === 'hitarth';

  return (
    <aside className="w-18 sm:w-20 bg-slate-950 border-r border-slate-900 flex flex-col items-center py-3 select-none shrink-0 z-30">
      {/* HITARTH Brand Logo */}
      <button
        type="button"
        onClick={() => {
          sound.playCoin();
          onSelectServer(servers[0]?.id || 'hitarth_official');
        }}
        className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 hover:rounded-xl text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/30 transition-all duration-200 cursor-pointer active:scale-95 group relative mb-2"
        title="HITARTH Home"
      >
        <span>⚡</span>
        <span className="absolute left-0 w-1 h-8 bg-white rounded-r-full -translate-x-full group-hover:translate-x-0 transition-transform" />
      </button>

      <div className="w-8 h-0.5 bg-slate-800 rounded-full my-1.5" />

      {/* DMs / Friends Hub */}
      <button
        type="button"
        onClick={() => {
          sound.playSlotTick();
          onSelectDMs();
        }}
        className={`w-12 h-12 rounded-3xl hover:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer mb-2 relative group ${
          activeView === 'dms'
            ? 'bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30'
            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
        title="Direct Messages & Friends Hub"
      >
        <MessageSquare className="w-5 h-5" />
        {activeView === 'dms' && (
          <span className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full" />
        )}
      </button>

      {/* Server List */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden space-y-2 px-3 py-1 scrollbar-none flex flex-col items-center">
        {servers.map((server) => {
          const isActive = activeView === 'chat' && activeServerId === server.id;
          return (
            <button
              key={server.id}
              type="button"
              onClick={() => {
                sound.playSlotTick();
                onSelectServer(server.id);
              }}
              className={`w-12 h-12 rounded-3xl hover:rounded-2xl flex items-center justify-center text-xl font-bold transition-all duration-200 cursor-pointer relative group ${
                isActive
                  ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
              title={server.name}
            >
              <span>{server.icon}</span>
              {isActive && (
                <span className="absolute left-0 w-1.5 h-8 bg-white rounded-r-full" />
              )}
            </button>
          );
        })}

        {/* Explore Public Servers */}
        <button
          type="button"
          onClick={() => {
            sound.playSlotTick();
            onOpenExplore();
          }}
          className="w-12 h-12 rounded-3xl hover:rounded-2xl bg-slate-900 hover:bg-emerald-600 text-emerald-400 hover:text-white flex items-center justify-center transition-all duration-200 cursor-pointer"
          title="Explore Public Servers"
        >
          <Compass className="w-5 h-5" />
        </button>

        {/* HITARTH DEVELOPER STUDIO TOGGLE BUTTON */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              sound.playJackpot();
              onSelectDevStudio();
            }}
            className={`w-12 h-12 rounded-3xl hover:rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer relative border ${
              activeView === 'dev_studio'
                ? 'bg-purple-600 text-white border-purple-400 rounded-2xl shadow-xl shadow-purple-600/40'
                : 'bg-slate-900/90 text-purple-400 border-purple-500/40 hover:bg-purple-950/60 hover:text-purple-300'
            }`}
            title="HITARTH Developer Studio (IDE)"
          >
            <Code2 className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">DEV</span>
            {activeView === 'dev_studio' && (
              <span className="absolute left-0 w-1.5 h-8 bg-amber-400 rounded-r-full" />
            )}
          </button>
        </div>
      </div>

      {/* User Quick Controls Bar */}
      <div className="w-full px-2 pt-2 border-t border-slate-900 flex flex-col items-center gap-2">
        {/* User Mini Avatar */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="relative group cursor-pointer"
          title={`${account?.inGameName || 'Player'} (${account?.id || 'OWO-9850'})`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-lg border border-purple-400 shadow-md">
            {account?.avatar || '⚡'}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
          {isDeveloper && (
            <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1 -right-1 drop-shadow" />
          )}
        </button>

        {/* Mute and Settings */}
        <div className="flex items-center justify-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={onToggleMute}
            className={`p-1.5 rounded-lg hover:bg-slate-800 transition-colors ${
              isMuted ? 'text-rose-400' : 'hover:text-white'
            }`}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
            title="Settings & Profile"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
