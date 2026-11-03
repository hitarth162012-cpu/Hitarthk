import React, { useState } from 'react';
import { ChatChannel, ChatServer, UserAccount } from '../../types';
import { sound } from '../../utils/audioSynth';
import {
  Hash,
  Volume2,
  Lock,
  Plus,
  ChevronDown,
  Sparkles,
  Bot,
  Swords,
  Compass,
  Trophy,
  Crown,
  Settings,
} from 'lucide-react';

interface ChannelSidebarProps {
  server: ChatServer;
  activeChannelId: string;
  account: UserAccount | null;
  onSelectChannel: (channelId: string) => void;
  onOpenCreateChannel: () => void;
  onOpenServerSettings?: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  server,
  activeChannelId,
  account,
  onSelectChannel,
  onOpenCreateChannel,
  onOpenServerSettings,
}) => {
  const isDeveloper =
    account?.isDeveloper ||
    account?.id === 'OWO-9850' ||
    account?.inGameName.toLowerCase() === 'hitarth';

  // Group channels by category
  const categories = [
    { title: 'TEXT CHANNELS', icon: Hash },
    { title: 'BOT COMMANDS', icon: Bot },
    { title: 'GAMES & EXPEDITIONS', icon: Compass },
    { title: 'CREATURE BATTLES', icon: Swords },
  ] as const;

  return (
    <div className="w-60 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Server Header Dropdown Bar */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shadow-sm bg-slate-900/90">
        <div className="flex items-center gap-2 truncate">
          <span className="text-xl">{server.icon}</span>
          <h3 className="font-black text-sm text-white tracking-tight truncate">
            {server.name}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => {
            sound.playSlotTick();
            if (onOpenServerSettings) onOpenServerSettings();
          }}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Server Options"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {categories.map((cat) => {
          const categoryChannels = server.channels.filter(
            (c) => c.category === cat.title || (!c.category && cat.title === 'TEXT CHANNELS')
          );

          if (categoryChannels.length === 0) return null;

          return (
            <div key={cat.title} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5">
                  <cat.icon className="w-3 h-3 text-slate-400" />
                  <span>{cat.title}</span>
                </span>
                {isDeveloper && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playSlotTick();
                      onOpenCreateChannel();
                    }}
                    className="p-0.5 hover:text-white rounded hover:bg-slate-800 transition-colors"
                    title="Create Channel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Channels in Category */}
              <div className="space-y-0.5">
                {categoryChannels.map((channel) => {
                  const isActive = activeChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        sound.playSlotTick();
                        onSelectChannel(channel.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                          : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {channel.isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <Hash className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
                        )}
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {channel.unreadCount && channel.unreadCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Status Bar at Bottom */}
      <div className="p-2.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-sm font-bold text-white border border-purple-400">
              {account?.avatar || '⚡'}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-white truncate flex items-center gap-1">
              <span>{account?.inGameName || 'Hitarth'}</span>
              {isDeveloper && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {account?.id || 'OWO-9850'} {isDeveloper ? '• [DEV]' : ''}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playSlotTick();
            if (onOpenServerSettings) onOpenServerSettings();
          }}
          className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
