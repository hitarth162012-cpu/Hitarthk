import React, { useState, useRef, useEffect } from 'react';
import { ChatChannel, ChatMessage, UserAccount } from '../../types';
import { MessageItem } from './MessageItem';
import { MessageInput } from './MessageInput';
import { sound } from '../../utils/audioSynth';
import {
  Hash,
  Pin,
  Users,
  Search,
  Lock,
  X,
  Sparkles,
  Bot,
  HelpCircle,
  Menu,
  Ticket,
  Crown,
} from 'lucide-react';
import { isUserDeveloper } from '../../utils/customCodeService';

interface ChatAreaProps {
  channel: ChatChannel;
  messages: ChatMessage[];
  currentAccount: UserAccount | null;
  onSendMessage: (content: string, replyTo?: ChatMessage | null) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTogglePin: (messageId: string) => void;
  onRunBotCommand?: (command: string) => void;
  onToggleMemberList: () => void;
  showMemberList: boolean;
  onOpenMobileDrawer?: () => void;
  onOpenRedeemModal?: () => void;
  onOpenDevCodeModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  currentAccount,
  onSendMessage,
  onReact,
  onTogglePin,
  onRunBotCommand,
  onToggleMemberList,
  showMemberList,
  onOpenMobileDrawer,
  onOpenRedeemModal,
  onOpenDevCodeModal,
}) => {
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = (content: string) => {
    onSendMessage(content, replyingTo);
    setReplyingTo(null);
  };

  const handleTyping = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  const filteredMessages = messages.filter((m) => {
    if (showPinnedOnly && !m.isPinned) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchContent = m.content?.toLowerCase().includes(q);
      const matchSender = m.senderName?.toLowerCase().includes(q);
      const matchBotCard = m.botCard?.title?.toLowerCase().includes(q);
      return matchContent || matchSender || matchBotCard;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950/70 overflow-hidden relative">
      {/* Channel Top Header Bar */}
      <header className="h-14 px-3 sm:px-6 border-b border-slate-900 bg-slate-950/90 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate">
          {/* Mobile hamburger menu toggle */}
          {onOpenMobileDrawer && (
            <button
              type="button"
              onClick={onOpenMobileDrawer}
              className="md:hidden p-1.5 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="Open Channels & Servers"
            >
              <Menu className="w-5 h-5 text-indigo-400" />
            </button>
          )}

          {channel.isLocked ? (
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
          ) : (
            <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
          )}
          <span className="font-black text-sm text-white tracking-tight">{channel.name}</span>
          {channel.topic && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-700 hidden sm:block" />
              <span className="text-xs text-slate-400 truncate hidden sm:block max-w-md">
                {channel.topic}
              </span>
            </>
          )}
        </div>

        {/* Top Header Action Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400">
          {/* Quick Redeem Code Button */}
          {onOpenRedeemModal && (
            <button
              type="button"
              onClick={onOpenRedeemModal}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition shadow-sm active:scale-95"
              title="Redeem Secret Game Code"
            >
              <Ticket className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Redeem</span>
            </button>
          )}

          {/* Developer Code Vault Button (Developer Only) */}
          {isUserDeveloper(currentAccount) && onOpenDevCodeModal && (
            <button
              type="button"
              onClick={onOpenDevCodeModal}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-400/50 text-xs font-bold transition shadow-sm active:scale-95"
              title="Developer Secret Code Vault & Generator"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Code Vault</span>
            </button>
          )}

          {/* Search Toggle */}
          <div className="relative">
            {showSearch ? (
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in channel..."
                  className="bg-transparent text-white text-xs focus:outline-none w-32 sm:w-44"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="p-0.5 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-slate-900 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Search Messages"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Pinned Messages Toggle */}
          <button
            type="button"
            onClick={() => {
              sound.playSlotTick();
              setShowPinnedOnly(!showPinnedOnly);
            }}
            className={`p-2 rounded-lg transition-colors relative cursor-pointer ${
              showPinnedOnly
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'hover:bg-slate-900 hover:text-white'
            }`}
            title="Pinned Messages"
          >
            <Pin className="w-4 h-4" />
            {pinnedMessages.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Member List Toggle */}
          <button
            type="button"
            onClick={() => {
              sound.playSlotTick();
              onToggleMemberList();
            }}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              showMemberList
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-900 hover:text-white'
            }`}
            title="Toggle Member List"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pinned Messages Notice Bar */}
      {showPinnedOnly && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/60 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-amber-400" />
            <span>Showing {pinnedMessages.length} Pinned Messages in #{channel.name}</span>
          </div>
          <button
            onClick={() => setShowPinnedOnly(false)}
            className="px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-white text-[11px] font-bold"
          >
            View All Messages
          </button>
        </div>
      )}

      {/* Message List Stream */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-3 scroll-smooth">
        {/* Welcome Channel Banner */}
        <div className="px-4 py-6 text-center sm:text-left space-y-2 border-b border-slate-900 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl text-indigo-400 mx-auto sm:mx-0">
            <Hash className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Welcome to #{channel.name}!
          </h2>
          <p className="text-xs text-slate-400 max-w-lg">
            This is the start of the #{channel.name} channel on HITARTH. Use <strong className="text-indigo-400">/owo help</strong> to run any economy, minigame or safari creature command directly in chat.
          </p>
        </div>

        {/* Messages */}
        {filteredMessages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            currentUserId={currentAccount?.id || 'OWO-9850'}
            onReact={onReact}
            onReply={(targetMsg) => {
              setReplyingTo(targetMsg);
              sound.playSlotTick();
            }}
            onTogglePin={onTogglePin}
            onRunBotCommand={onRunBotCommand}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="px-6 py-1 text-[11px] text-slate-400 flex items-center gap-1.5 animate-pulse font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
          <span>{currentAccount?.inGameName || 'Hitarth'} is typing...</span>
        </div>
      )}

      {/* Message Input Bar */}
      <MessageInput
        channelName={channel.name}
        onSendMessage={handleSend}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        onTyping={handleTyping}
      />
    </div>
  );
};
