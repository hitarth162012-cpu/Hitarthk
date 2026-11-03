import React, { useState, useRef, useEffect } from 'react';
import { OWO_COMMANDS_LIST, CommandSuggestion } from '../../utils/botEngine';
import { sound } from '../../utils/audioSynth';
import {
  Send,
  Smile,
  Paperclip,
  Sparkles,
  X,
  Reply,
  HelpCircle,
  Command,
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface MessageInputProps {
  channelName: string;
  onSendMessage: (content: string) => void;
  replyingTo?: ChatMessage | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

const EMOJI_LIST = ['⚡', '👑', '🔥', '💎', '🎉', '🐯', '🦁', '🚀', '❤️', '👍', '⚔️', '🍀'];

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  onSendMessage,
  replyingTo,
  onCancelReply,
  onTyping,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [slashSuggestions, setSlashSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect slash-commands
  useEffect(() => {
    if (content.startsWith('/')) {
      const query = content.toLowerCase();
      const filtered = OWO_COMMANDS_LIST.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query.replace('/', ''))
      );
      setSlashSuggestions(filtered);
      setSelectedIdx(0);
    } else {
      setSlashSuggestions([]);
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (slashSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev + 1) % slashSuggestions.length);
        sound.playSlotTick();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => (prev - 1 + slashSuggestions.length) % slashSuggestions.length);
        sound.playSlotTick();
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !content.includes(' '))) {
        e.preventDefault();
        const chosen = slashSuggestions[selectedIdx];
        if (chosen) {
          setContent(chosen.name + ' ');
          setSlashSuggestions([]);
          sound.playCoin();
          return;
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const clean = content.trim();
    if (!clean) return;
    onSendMessage(clean);
    setContent('');
    setSlashSuggestions([]);
    setShowEmojiPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const selectSuggestion = (cmd: CommandSuggestion) => {
    setContent(cmd.name + ' ');
    setSlashSuggestions([]);
    sound.playSlotTick();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative p-4 bg-slate-950/80 border-t border-slate-900">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Replying to</span>
            <span className="font-bold text-white">@{replyingTo.senderName}</span>
            <span className="truncate text-slate-400 italic">"{replyingTo.content}"</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Slash Command Autocomplete Popover */}
      {slashSuggestions.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-72 flex flex-col">
          <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-400">
              <Command className="w-3.5 h-3.5" />
              <span>HITARTH BOT COMMANDS</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Use ↑ ↓ to navigate, Tab/Enter to choose
            </span>
          </div>
          <div className="overflow-y-auto divide-y divide-slate-800/60 p-1">
            {slashSuggestions.slice(0, 10).map((cmd, idx) => (
              <button
                key={cmd.name}
                type="button"
                onClick={() => selectSuggestion(cmd)}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                  idx === selectedIdx
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                    : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black font-mono text-sm text-indigo-300">{cmd.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                      {cmd.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{cmd.description}</div>
                </div>
                <span className="text-[11px] font-mono text-amber-400 hidden sm:block shrink-0">
                  {cmd.syntax}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box Bar */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-3 py-2 focus-within:border-indigo-500 transition-colors shadow-inner">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => {
            sound.playSlotTick();
            setContent((prev) => prev + ' 📎 [Attachment: logs.json] ');
          }}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
          title="Add Attachment"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (onTyping) onTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName} (Type / for commands)`}
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 font-medium focus:outline-none"
        />

        {/* Emoji Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
            title="Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {showEmojiPicker && (
            <div className="absolute right-0 bottom-10 bg-slate-900 border border-slate-700 p-2.5 rounded-2xl shadow-2xl grid grid-cols-4 gap-1.5 z-40 w-44">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setContent((prev) => prev + em);
                    setShowEmojiPicker(false);
                    sound.playSlotTick();
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded-xl text-lg flex items-center justify-center hover:scale-115 transition-transform"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
          title="Send Message"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1 font-mono">
        <span>Press <kbd className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-400">Enter</kbd> to send</span>
        <span>Type <strong className="text-indigo-400">/owo help</strong> for game bot guide</span>
      </div>
    </div>
  );
};
