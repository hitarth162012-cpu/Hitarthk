import React from 'react';
import { UserAccount, FriendUser } from '../../types';
import { Crown, Bot, Shield, User } from 'lucide-react';
import { sound } from '../../utils/audioSynth';

interface MemberListProps {
  currentAccount: UserAccount | null;
  onlineFriends: FriendUser[];
  onSelectMember?: (member: { id: string; name: string; avatar: string; isDev?: boolean }) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  currentAccount,
  onlineFriends,
  onSelectMember,
}) => {
  const isCurrentDev =
    currentAccount?.isDeveloper ||
    currentAccount?.id === 'OWO-9850' ||
    currentAccount?.inGameName.toLowerCase() === 'hitarth';

  return (
    <aside className="w-56 sm:w-60 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 select-none overflow-y-auto px-3 py-4 space-y-4">
      {/* DEVELOPERS CATEGORY */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
          DEVELOPERS — 1
        </div>
        <div
          onClick={() => {
            sound.playSlotTick();
            if (onSelectMember) {
              onSelectMember({
                id: 'OWO-9850',
                name: 'Hitarth',
                avatar: '👑',
                isDev: true,
              });
            }
          }}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-amber-500 flex items-center justify-center text-sm border border-purple-400 shadow-md">
              👑
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-purple-300 truncate flex items-center gap-1">
              <span>Hitarth</span>
              <Crown className="w-3 h-3 text-amber-400 shrink-0" />
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Owner • Developer</div>
          </div>
        </div>
      </div>

      {/* BOTS CATEGORY */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
          BOTS — 1
        </div>
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-sm border border-indigo-400 shadow-md">
              🤖
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
          </div>
          <div className="truncate">
            <div className="text-xs font-black text-indigo-300 truncate flex items-center gap-1">
              <span>HITARTH BOT</span>
              <span className="px-1 py-0.2 rounded bg-indigo-600 text-white text-[8px] font-black">
                BOT
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Game & Economy Engine</div>
          </div>
        </div>
      </div>

      {/* ONLINE PLAYERS */}
      <div className="space-y-1">
        <div className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
          ONLINE — {1 + onlineFriends.length}
        </div>

        {/* Current Player if not Hitarth */}
        {!isCurrentDev && currentAccount && (
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-800/50">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm border border-slate-700">
                {currentAccount.avatar || '⚡'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">
                {currentAccount.inGameName}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Playing /owo cf</div>
            </div>
          </div>
        )}

        {/* Friends / Other online players */}
        {onlineFriends.map((friend) => (
          <div
            key={friend.id}
            onClick={() => {
              sound.playSlotTick();
              if (onSelectMember) {
                onSelectMember({
                  id: friend.id,
                  name: friend.name,
                  avatar: friend.avatar,
                });
              }
            }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer group"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm border border-slate-700">
                {friend.avatar || '⚡'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-300 group-hover:text-white truncate">
                {friend.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {friend.petEmoji || '🐯'} {friend.petName || 'In Chat'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
