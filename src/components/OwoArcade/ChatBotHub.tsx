import React, { useState, useEffect, useRef } from 'react';
import { ChatChannel, ChatMessage, UserAccount, WalletState } from '../../types';
import { handleBotCommand, OWO_COMMANDS_LIST, CommandSuggestion } from '../../utils/botEngine';
import {
  subscribeChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
  togglePinMessage,
} from '../../services/chatService';
import { formatJoules, formatINR } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  Hash,
  Pin,
  Search,
  X,
  HelpCircle,
  Terminal,
  Paperclip,
  Smile,
  ShieldAlert,
  Zap,
  Users,
} from 'lucide-react';

interface ChatBotHubProps {
  wallet: WalletState;
  account: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onUpdateAccount?: (newAccount: UserAccount) => void;
  onOpenAuth: () => void;
  onOpenDevStudio?: () => void;
}

const CHAT_CHANNELS = [
  { id: 'general', name: 'general', icon: '💬', desc: 'Community hangout and discussion' },
  { id: 'bot-commands', name: 'bot-commands', icon: '🤖', desc: 'Run /owo bot commands' },
  { id: 'games', name: 'games', icon: '🎰', desc: 'Minigames, coin flips & slots' },
  { id: 'hunting', name: 'hunting', icon: '🏹', desc: 'Safari expeditions & discoveries' },
  { id: 'battles', name: 'battles', icon: '⚔️', desc: 'Pet battles & PvP duels' },
  { id: 'announcements', name: 'announcements', icon: '📢', desc: 'Official updates from developer' },
];

const QUICK_BOT_ACTIONS = [
  { label: '⚡ /owo balance', cmd: '/owo balance' },
  { label: '🎁 /owo daily', cmd: '/owo daily' },
  { label: '💼 /owo work', cmd: '/owo work' },
  { label: '🏹 /owo hunt', cmd: '/owo hunt' },
  { label: '🪙 /owo cf 200', cmd: '/owo cf 200 heads' },
  { label: '🎰 /owo s 200', cmd: '/owo s 200' },
  { label: '❓ /owo help', cmd: '/owo help' },
];

const EMOJIS = ['⚡', '🪙', '🔥', '👑', '🎉', '🐯', '💎', '👍', '❤️'];

export const ChatBotHub: React.FC<ChatBotHubProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onUpdateAccount,
  onOpenAuth,
  onOpenDevStudio,
}) => {
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [slashSuggestions, setSlashSuggestions] = useState<CommandSuggestion[]>([]);
  const [selectedSlashIdx, setSelectedSlashIdx] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDev =
    account?.isDeveloper === true ||
    account?.id === 'OWO-9850' ||
    (account?.inGameName && account.inGameName.toLowerCase() === 'hitarth') ||
    account?.role === 'developer';

  // Real-time message subscription
  useEffect(() => {
    const unsub = subscribeChannelMessages(activeChannelId, (incoming) => {
      setMessages(incoming);
    });
    return () => unsub();
  }, [activeChannelId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeChannelId]);

  // Autocomplete suggestions
  useEffect(() => {
    if (inputContent.startsWith('/')) {
      const q = inputContent.toLowerCase();
      const filtered = OWO_COMMANDS_LIST.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q.replace('/', ''))
      );
      setSlashSuggestions(filtered);
      setSelectedSlashIdx(0);
    } else {
      setSlashSuggestions([]);
    }
  }, [inputContent]);

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputContent;
    const clean = textToSend.trim();
    if (!clean) return;

    setInputContent('');
    setSlashSuggestions([]);
    setShowEmojiPicker(false);

    const senderId = account?.id || 'OWO-9850';
    const senderName = account?.inGameName || 'Hitarth';
    const senderAvatar = account?.avatar || '👑';

    // 1. Post user's message
    sound.playCoin();
    await sendChatMessage(activeChannelId, 'hitarth_official', {
      senderId,
      senderName,
      senderAvatar,
      isDeveloper: isDev,
      role: isDev ? 'developer' : 'member',
      content: clean,
    });

    // 2. Execute Bot command if starts with / or owo
    if (clean.startsWith('/') || clean.toLowerCase().startsWith('owo ') || clean.toLowerCase().startsWith('!owo ')) {
      const botResult = await handleBotCommand(clean, wallet, account, []);

      if (botResult.isHandled && botResult.botCard) {
        setTimeout(async () => {
          await sendChatMessage(activeChannelId, 'hitarth_official', {
            senderId: 'hitarth_bot',
            senderName: 'HITARTH BOT',
            senderAvatar: '🤖',
            isBot: true,
            role: 'bot',
            content: '',
            botCard: botResult.botCard,
          });

          if (botResult.updatedWallet) {
            onUpdateWallet(botResult.updatedWallet);
          }
          if (botResult.updatedAccount && onUpdateAccount) {
            onUpdateAccount(botResult.updatedAccount);
          }
        }, 120);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (slashSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIdx((prev) => (prev + 1) % slashSuggestions.length);
        sound.playSlotTick();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIdx((prev) => (prev - 1 + slashSuggestions.length) % slashSuggestions.length);
        sound.playSlotTick();
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !inputContent.includes(' '))) {
        e.preventDefault();
        const chosen = slashSuggestions[selectedSlashIdx];
        if (chosen) {
          setInputContent(chosen.name + ' ');
          setSlashSuggestions([]);
          sound.playCoin();
          return;
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (showPinnedOnly && !m.isPinned) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.content?.toLowerCase().includes(q) ||
        m.senderName?.toLowerCase().includes(q) ||
        m.botCard?.title?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeChannel = CHAT_CHANNELS.find((c) => c.id === activeChannelId) || CHAT_CHANNELS[0];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Banner Card in HITARTH Style */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-purple-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/20 text-white font-black">
            🤖
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                HITARTH Real-Time Chat & Game Bot
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ONLINE
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                ⚡ Joules Economy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Type <strong className="text-amber-400 font-mono">/owo help</strong> or any slash command in chat. Real-time multiplayer synchronization powered by Firebase.
            </p>
          </div>
        </div>

        {/* Quick Balance & Developer shortcuts */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-between md:justify-end">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs">
            <span className="text-amber-400 font-bold">⚡ Balance:</span>
            <span className="font-extrabold text-white">{formatJoules(wallet.balanceINR)}</span>
          </div>
          {isDev && onOpenDevStudio && (
            <button
              onClick={onOpenDevStudio}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-300" />
              <span>Dev Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Chat Box Container */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[650px] max-h-[80vh]">
        
        {/* Channel Navigation Pills */}
        <div className="p-2.5 sm:p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5">
            {CHAT_CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  sound.playSlotTick();
                  setActiveChannelId(ch.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeChannelId === ch.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{ch.icon}</span>
                <span>#{ch.name}</span>
              </button>
            ))}
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowPinnedOnly(!showPinnedOnly)}
              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${
                showPinnedOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Filter Pinned Messages"
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Command Suggestions Strip */}
        <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-bold uppercase text-[10px] shrink-0 mr-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Quick Bot Actions:
          </span>
          {QUICK_BOT_ACTIONS.map((action) => (
            <button
              key={action.cmd}
              onClick={() => handleSend(action.cmd)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-amber-300 border border-slate-700/60 font-mono whitespace-nowrap transition active:scale-95"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/20">
          {filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-2">
                💬
              </div>
              <p className="text-sm font-bold text-slate-400">Welcome to #{activeChannel.name}</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Be the first to say hello or type <span className="font-mono text-amber-400">/owo daily</span> to claim your daily bonus!
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isBotMsg = msg.isBot;
              const isCurrentUser = msg.senderId === account?.id;
              const isDevMsg = msg.isDeveloper;

              return (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isBotMsg
                      ? 'bg-slate-900/90 border-purple-500/30 shadow-md'
                      : isCurrentUser
                      ? 'bg-slate-900/60 border-slate-800'
                      : 'bg-slate-950/50 border-slate-800/60'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-sm shadow-inner">
                        {msg.senderAvatar || '⚡'}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-white">
                        {msg.senderName}
                      </span>
                      {isDevMsg && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          👑 DEVELOPER
                        </span>
                      )}
                      {isBotMsg && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          🤖 BOT
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Pin and Action icon */}
                    <div className="flex items-center gap-1 text-slate-500">
                      <button
                        onClick={() => togglePinMessage(activeChannelId, msg.id)}
                        className={`p-1 hover:text-amber-400 rounded transition ${msg.isPinned ? 'text-amber-400' : 'text-slate-600'}`}
                        title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Message Body Content */}
                  {msg.content && (
                    <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans pl-9">
                      {msg.content}
                    </div>
                  )}

                  {/* Embedded Bot Result Card (Clean HITARTH Theme) */}
                  {msg.botCard && (
                    <div className="mt-2.5 ml-9 rounded-xl bg-slate-950 border-l-4 border-l-amber-500 border border-slate-800/80 p-3.5 shadow-lg space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-amber-300 tracking-wide">
                            {msg.botCard.title}
                          </h4>
                          {msg.botCard.subtitle && (
                            <p className="text-[11px] text-slate-400">{msg.botCard.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs font-mono text-purple-400 font-bold">HITARTH BOT</span>
                      </div>

                      {/* Fields Grid */}
                      {msg.botCard.fields && msg.botCard.fields.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                          {msg.botCard.fields.map((field, i) => (
                            <div key={i} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {field.label}
                              </span>
                              <span className="text-xs font-semibold text-slate-100">
                                {field.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Progress Bar if available */}
                      {msg.botCard.progress && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{msg.botCard.progress.label || 'Progress'}</span>
                            <span>{msg.botCard.progress.current} / {msg.botCard.progress.max}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                              style={{ width: `${Math.min(100, Math.round((msg.botCard.progress.current / msg.botCard.progress.max) * 100))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer Note */}
                      {msg.botCard.footer && (
                        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/40 italic">
                          {msg.botCard.footer}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="flex items-center gap-1.5 mt-2 ml-9">
                    {msg.reactions &&
                      Object.entries(msg.reactions).map(([emoji, userIds]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleMessageReaction(activeChannelId, msg.id, emoji, account?.id || 'OWO-9850')}
                          className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] flex items-center gap-1 text-slate-300 hover:border-amber-400 transition"
                        >
                          <span>{emoji}</span>
                          <span className="font-bold text-[10px] text-slate-400">{userIds.length}</span>
                        </button>
                      ))}

                    {/* Quick Reaction Adder */}
                    <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                      {['⚡', '🪙', '🔥'].map((em) => (
                        <button
                          key={em}
                          onClick={() => toggleMessageReaction(activeChannelId, msg.id, em, account?.id || 'OWO-9850')}
                          className="w-5 h-5 rounded flex items-center justify-center text-xs hover:bg-slate-800 transition"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Slash Command Suggestions Popover */}
        {slashSuggestions.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-950 p-2 max-h-48 overflow-y-auto divide-y divide-slate-800/50">
            <div className="px-2 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider flex justify-between">
              <span>HITARTH BOT COMMAND DIRECTORY</span>
              <span className="text-slate-500 font-mono">Use ↑ ↓ & Enter</span>
            </div>
            {slashSuggestions.slice(0, 6).map((cmd, idx) => (
              <button
                key={cmd.name}
                onClick={() => {
                  setInputContent(cmd.name + ' ');
                  setSlashSuggestions([]);
                  inputRef.current?.focus();
                  sound.playSlotTick();
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                  idx === selectedSlashIdx ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-850'
                }`}
              >
                <span className="font-mono font-bold text-amber-300">{cmd.name}</span>
                <span className="text-[11px] text-slate-400 truncate max-w-xs">{cmd.description}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                  {cmd.category}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Message Input Bar (HITARTH Design) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          {/* Emoji Popover */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 text-slate-400 hover:text-white transition"
              title="Add Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 bottom-12 bg-slate-900 border border-slate-700 p-2 rounded-xl shadow-2xl grid grid-cols-3 gap-1 z-30 w-36">
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => {
                      setInputContent((prev) => prev + em);
                      setShowEmojiPicker(false);
                      sound.playSlotTick();
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-base flex items-center justify-center transition hover:scale-110"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${activeChannel.name} (Type / for commands, e.g. /owo daily)`}
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 font-medium outline-none transition"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputContent.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
