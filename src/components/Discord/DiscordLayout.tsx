import React, { useState, useEffect } from 'react';
import {
  ChatServer,
  ChatChannel,
  ChatMessage,
  UserAccount,
  WalletState,
  FriendUser,
  FriendRequest,
} from '../../types';
import { ServerSidebar } from './ServerSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { ChatArea } from './ChatArea';
import { MemberList } from './MemberList';
import { DirectMessagesHub } from './DirectMessagesHub';
import { ChannelManageModal } from './ChannelManageModal';
import { ExploreServersModal } from './ExploreServersModal';
import { RedeemCodeModal } from '../RedeemCodeModal';
import { DeveloperCodeModal } from '../DeveloperCodeModal';
import { handleBotCommand } from '../../utils/botEngine';
import {
  DEFAULT_SERVERS,
  getStoredChannels,
  addChannel,
  subscribeChannelMessages,
  sendChatMessage,
  toggleMessageReaction,
  togglePinMessage,
} from '../../services/chatService';
import { sound } from '../../utils/audioSynth';
import { saveWalletToFirestore } from '../../services/firebaseService';

interface DiscordLayoutProps {
  account: UserAccount | null;
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onUpdateAccount: (newAccount: UserAccount) => void;
  onOpenDevStudio: () => void;
  onOpenSettings: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  friends: FriendUser[];
  incomingRequests: FriendRequest[];
  onAddFriend: (targetId: string) => void;
  onAcceptRequest: (req: FriendRequest) => void;
  onDeclineRequest: (reqId: string) => void;
}

export const DiscordLayout: React.FC<DiscordLayoutProps> = ({
  account,
  wallet,
  onUpdateWallet,
  onUpdateAccount,
  onOpenDevStudio,
  onOpenSettings,
  isMuted,
  onToggleMute,
  friends,
  incomingRequests,
  onAddFriend,
  onAcceptRequest,
  onDeclineRequest,
}) => {
  const [servers, setServers] = useState<ChatServer[]>(DEFAULT_SERVERS);
  const [activeServerId, setActiveServerId] = useState<string>('hitarth_official');
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [activeView, setActiveView] = useState<'chat' | 'dms' | 'dev_studio'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMemberList, setShowMemberList] = useState<boolean>(true);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);

  // Mobile Drawer & Code Modals
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileMemberDrawerOpen, setIsMobileMemberDrawerOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [isDevCodeModalOpen, setIsDevCodeModalOpen] = useState(false);

  // Active server and channels
  const activeServer = servers.find((s) => s.id === activeServerId) || servers[0];
  const channels = getStoredChannels(activeServer.id);
  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || {
    id: 'general',
    serverId: activeServer.id,
    name: 'general',
    category: 'TEXT CHANNELS',
  };

  // Real-time Firestore subscription to active channel messages
  useEffect(() => {
    const unsub = subscribeChannelMessages(activeChannel.id, (cloudMessages) => {
      setMessages(cloudMessages);
    });
    return () => unsub();
  }, [activeChannel.id]);

  // Handle sending a message
  const handleSendMessage = async (content: string, replyTo?: ChatMessage | null) => {
    const clean = content.trim();
    if (!clean) return;

    const isDeveloper =
      account?.isDeveloper ||
      account?.id === 'OWO-9850' ||
      account?.inGameName.toLowerCase() === 'hitarth';

    // 1. Send the user's message
    const userMsg = await sendChatMessage(activeChannel.id, activeServer.id, {
      senderId: account?.id || 'OWO-9850',
      senderName: account?.inGameName || 'Hitarth',
      senderAvatar: account?.avatar || '👑',
      isDeveloper,
      role: isDeveloper ? 'developer' : 'member',
      content: clean,
      replyTo: replyTo
        ? { id: replyTo.id, senderName: replyTo.senderName, content: replyTo.content }
        : undefined,
    });

    sound.playCoin();

    // 2. Check if this is an OwO Bot command
    if (clean.startsWith('/') || clean.toLowerCase().startsWith('owo ') || clean.toLowerCase().startsWith('!owo ')) {
      const botResult = await handleBotCommand(clean, wallet, account, []);

      if (botResult.isHandled && botResult.botCard) {
        // Dispatch HITARTH BOT's response directly to this channel
        setTimeout(async () => {
          await sendChatMessage(activeChannel.id, activeServer.id, {
            senderId: 'hitarth_bot',
            senderName: 'HITARTH BOT',
            senderAvatar: '🤖',
            isBot: true,
            role: 'bot',
            content: '',
            botCard: botResult.botCard,
          });

          // Update wallet if changed
          if (botResult.updatedWallet) {
            onUpdateWallet(botResult.updatedWallet);
            if (account?.uid) {
              saveWalletToFirestore(account.uid, botResult.updatedWallet, account);
            }
          }

          // Update account if changed
          if (botResult.updatedAccount) {
            onUpdateAccount(botResult.updatedAccount);
          }
        }, 350);
      }
    }
  };

  const handleRunBotCommand = (cmd: string) => {
    handleSendMessage(cmd);
  };

  const handleCreateChannel = (chData: { name: string; category: ChatChannel['category']; topic: string }) => {
    const newChan: ChatChannel = {
      id: `ch_${Date.now()}_${chData.name}`,
      serverId: activeServer.id,
      name: chData.name,
      category: chData.category,
      topic: chData.topic,
    };
    const updated = addChannel(activeServer.id, newChan);
    setServers((prev) =>
      prev.map((s) => (s.id === activeServer.id ? { ...s, channels: updated } : s))
    );
    setActiveChannelId(newChan.id);
  };

  const handleSelectServer = (serverId: string) => {
    setActiveServerId(serverId);
    setActiveView('chat');
    const chs = getStoredChannels(serverId);
    if (chs.length > 0) {
      setActiveChannelId(chs[0].id);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full bg-slate-950 font-sans relative">
      {/* 1. DESKTOP LEFTMOST SERVER SIDEBAR (hidden on mobile) */}
      <div className="hidden md:flex shrink-0 h-full">
        <ServerSidebar
          servers={servers}
          activeServerId={activeServerId}
          activeView={activeView}
          account={account}
          onSelectServer={handleSelectServer}
          onSelectDMs={() => setActiveView('dms')}
          onSelectDevStudio={onOpenDevStudio}
          onOpenExplore={() => setIsExploreModalOpen(true)}
          onOpenSettings={onOpenSettings}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
        />
      </div>

      {/* 2. MAIN CENTER CONTENT */}
      {activeView === 'dms' ? (
        <DirectMessagesHub
          account={account}
          wallet={wallet}
          friends={friends}
          incomingRequests={incomingRequests}
          onAddFriend={onAddFriend}
          onAcceptRequest={onAcceptRequest}
          onDeclineRequest={onDeclineRequest}
          onUpdateWallet={onUpdateWallet}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden min-w-0 w-full h-full">
          {/* Desktop Channels Sidebar (hidden on mobile) */}
          <div className="hidden md:flex shrink-0 h-full">
            <ChannelSidebar
              server={{ ...activeServer, channels }}
              activeChannelId={activeChannel.id}
              account={account}
              onSelectChannel={setActiveChannelId}
              onOpenCreateChannel={() => setIsChannelModalOpen(true)}
              onOpenServerSettings={onOpenSettings}
            />
          </div>

          {/* Main Chat Stream Area (100% width on phone) */}
          <ChatArea
            channel={activeChannel}
            messages={messages}
            currentAccount={account}
            onSendMessage={handleSendMessage}
            onReact={(mId, em) => toggleMessageReaction(activeChannel.id, mId, em, account?.id || 'OWO-9850')}
            onTogglePin={(mId) => togglePinMessage(activeChannel.id, mId)}
            onRunBotCommand={handleRunBotCommand}
            onToggleMemberList={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                setIsMobileMemberDrawerOpen(!isMobileMemberDrawerOpen);
              } else {
                setShowMemberList(!showMemberList);
              }
            }}
            showMemberList={showMemberList}
            onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
            onOpenRedeemModal={() => setIsRedeemModalOpen(true)}
            onOpenDevCodeModal={() => setIsDevCodeModalOpen(true)}
          />

          {/* Desktop Right Member List Panel (hidden on small/medium screens) */}
          {showMemberList && (
            <div className="hidden lg:flex shrink-0 h-full">
              <MemberList
                currentAccount={account}
                onlineFriends={friends}
                onSelectMember={(m) => {
                  handleSendMessage(`/owo profile`);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. MOBILE SLIDE-OVER DRAWER FOR SERVERS & CHANNELS */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          {/* Drawer Sheet */}
          <div className="relative flex h-full max-w-[88vw] shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <ServerSidebar
              servers={servers}
              activeServerId={activeServerId}
              activeView={activeView}
              account={account}
              onSelectServer={(sId) => {
                handleSelectServer(sId);
                setIsMobileDrawerOpen(false);
              }}
              onSelectDMs={() => {
                setActiveView('dms');
                setIsMobileDrawerOpen(false);
              }}
              onSelectDevStudio={() => {
                onOpenDevStudio();
                setIsMobileDrawerOpen(false);
              }}
              onOpenExplore={() => {
                setIsExploreModalOpen(true);
                setIsMobileDrawerOpen(false);
              }}
              onOpenSettings={() => {
                onOpenSettings();
                setIsMobileDrawerOpen(false);
              }}
              isMuted={isMuted}
              onToggleMute={onToggleMute}
            />
            <ChannelSidebar
              server={{ ...activeServer, channels }}
              activeChannelId={activeChannel.id}
              account={account}
              onSelectChannel={(cId) => {
                setActiveChannelId(cId);
                setIsMobileDrawerOpen(false);
              }}
              onOpenCreateChannel={() => setIsChannelModalOpen(true)}
              onOpenServerSettings={onOpenSettings}
            />
          </div>
        </div>
      )}

      {/* 4. MOBILE SLIDE-OVER DRAWER FOR MEMBER LIST */}
      {isMobileMemberDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMemberDrawerOpen(false)}
          />
          {/* Drawer Sheet */}
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 bg-slate-900 animate-in slide-in-from-right duration-200">
            <MemberList
              currentAccount={account}
              onlineFriends={friends}
              onSelectMember={(m) => {
                handleSendMessage(`/owo profile`);
                setIsMobileMemberDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 5. MODALS */}
      <ChannelManageModal
        isOpen={isChannelModalOpen}
        onClose={() => setIsChannelModalOpen(false)}
        onCreateChannel={handleCreateChannel}
      />

      <ExploreServersModal
        isOpen={isExploreModalOpen}
        onClose={() => setIsExploreModalOpen(false)}
        servers={servers}
        onSelectServer={handleSelectServer}
      />

      {/* Public Redeem Code Modal */}
      <RedeemCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={onUpdateWallet}
        account={account}
        onOpenDeveloperCodeModal={() => setIsDevCodeModalOpen(true)}
      />

      {/* Developer Code Vault & Generator Modal */}
      <DeveloperCodeModal
        isOpen={isDevCodeModalOpen}
        onClose={() => setIsDevCodeModalOpen(false)}
        account={account}
      />
    </div>
  );
};
