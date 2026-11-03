import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { BotEmbedCard } from './BotEmbedCard';
import { sound } from '../../utils/audioSynth';
import {
  Pin,
  Reply,
  Smile,
  Copy,
  Check,
  Crown,
  Bot,
  ShieldAlert,
} from 'lucide-react';

interface MessageItemProps {
  message: ChatMessage;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onTogglePin: (messageId: string) => void;
  onRunBotCommand?: (command: string) => void;
}

const COMMON_REACTIONS = ['❤️', '🔥', '👍', '🚀', '💎', '🎉', '⚔️'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserId,
  onReact,
  onReply,
  onTogglePin,
  onRunBotCommand,
}) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    sound.playSlotTick();
    setTimeout(() => setCopied(false), 2000);
  };

  const isDeveloper =
    message.isDeveloper ||
    message.senderId === 'OWO-9850' ||
    message.senderName.toLowerCase() === 'hitarth';

  return (
    <div
      onMouseEnter={() => setShowToolbar(true)}
      onMouseLeave={() => {
        setShowToolbar(false);
        setShowEmojiPicker(false);
      }}
      className={`group relative flex gap-3 px-4 py-2 hover:bg-slate-900/60 rounded-xl transition-colors ${
        message.isPinned ? 'bg-amber-950/20 border-l-2 border-amber-500' : ''
      }`}
    >
      {/* Hover Actions Toolbar */}
      {showToolbar && (
        <div className="absolute right-4 -top-3.5 z-20 flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-lg p-1 shadow-xl">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Add Reaction"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            {showEmojiPicker && (
              <div className="absolute right-0 top-8 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl flex gap-1 z-30">
                {COMMON_REACTIONS.map((em) => (
                  <button
                    key={em}
                    onClick={() => {
                      onReact(message.id, em);
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:scale-125 transition-transform text-sm"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onReply(message)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onTogglePin(message.id)}
            className={`p-1.5 hover:bg-slate-800 rounded transition-colors ${
              message.isPinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title={message.isPinned ? 'Unpin Message' : 'Pin Message'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* User Avatar */}
      <div className="shrink-0 pt-0.5">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md ${
            message.isBot
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-400/40 text-white'
              : isDeveloper
              ? 'bg-gradient-to-tr from-purple-600 to-amber-500 border border-purple-400/40'
              : 'bg-slate-800 border border-slate-700'
          }`}
        >
          {message.senderAvatar || '⚡'}
        </div>
      </div>

      {/* Message Content Body */}
      <div className="flex-1 min-w-0">
        {/* Reply Preview Header */}
        {message.replyTo && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
            <span className="text-slate-600">┌</span>
            <Reply className="w-3 h-3 text-slate-500" />
            <span className="font-bold text-slate-300">@{message.replyTo.senderName}:</span>
            <span className="truncate max-w-sm text-slate-400 italic">{message.replyTo.content}</span>
          </div>
        )}

        {/* Sender Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-black text-sm tracking-tight ${
              message.isBot
                ? 'text-indigo-300'
                : isDeveloper
                ? 'text-purple-300'
                : 'text-slate-100'
            }`}
          >
            {message.senderName}
          </span>

          {/* Badges */}
          {message.isBot && (
            <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
              <Bot className="w-2.5 h-2.5" />
              <span>BOT</span>
            </span>
          )}

          {isDeveloper && (
            <span className="px-1.5 py-0.2 rounded bg-purple-600/30 text-purple-300 border border-purple-500/50 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5">
              <Crown className="w-2.5 h-2.5 text-amber-400" />
              <span>DEV</span>
            </span>
          )}

          {message.isPinned && (
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" />
              <span>PINNED</span>
            </span>
          )}

          <span className="text-[10px] text-slate-400 font-mono">{formattedTime}</span>
        </div>

        {/* Text Message Content */}
        {message.content && (
          <div className="text-sm text-slate-200 mt-1 whitespace-pre-wrap leading-relaxed break-words font-normal">
            {message.content}
          </div>
        )}

        {/* Embedded Bot Response Card */}
        {message.botCard && (
          <BotEmbedCard card={message.botCard} onRunCommand={onRunBotCommand} />
        )}

        {/* Reactions List */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              const hasReacted = userIds.includes(currentUserId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(message.id, emoji)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                    hasReacted
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px]">{userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
