import React, { useState } from 'react';
import { ArcadeSubTab, WalletState, UserAccount } from '../../types';
import { CoinFlipGame } from './CoinFlipGame';
import { SlotsGame } from './SlotsGame';
import { HighLowGame } from './HighLowGame';
import { HuntGame } from './HuntGame';
import { BattleGame } from './BattleGame';
import { BattleTeamBuilder } from './BattleTeamBuilder';
import { MultiplayerHub } from './MultiplayerHub';
import { RedeemCodeSection } from './RedeemCodeSection';
import { Leaderboard } from './Leaderboard';
import { FriendsHub } from './FriendsHub';
import { PrivateServerSection } from './PrivateServerSection';
import { ChatBotHub } from './ChatBotHub';
import { DevStudio } from '../DevStudio/DevStudio';
import { sound } from '../../utils/audioSynth';
import { isUserDeveloper } from '../../utils/customCodeService';

interface ArcadeHubProps {
  wallet: WalletState;
  account: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onUpdateAccount?: (newAccount: UserAccount) => void;
  activeSubTab?: ArcadeSubTab;
  onSubTabChange?: (tab: ArcadeSubTab) => void;
  initialSubTab?: ArcadeSubTab;
  onOpenAuth: () => void;
  onOpenDeveloperCodeModal?: () => void;
}

export const ArcadeHub: React.FC<ArcadeHubProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onUpdateAccount,
  activeSubTab,
  onSubTabChange,
  initialSubTab = 'flip',
  onOpenAuth,
  onOpenDeveloperCodeModal,
}) => {
  const [internalSubTab, setInternalSubTab] = useState<ArcadeSubTab>(initialSubTab);
  const subTab = activeSubTab !== undefined ? activeSubTab : internalSubTab;

  const isDev = isUserDeveloper(account);

  const setSubTab = (newTab: ArcadeSubTab) => {
    setInternalSubTab(newTab);
    if (onSubTabChange) {
      onSubTabChange(newTab);
    }
  };

  const tabs: { id: ArcadeSubTab; label: string; icon: string; badge?: string }[] = [
    { id: 'flip', label: 'Coin Flip', icon: '🪙' },
    { id: 'slots', label: 'Slots', icon: '🎰' },
    { id: 'highlow', label: 'High-Low', icon: '🃏' },
    { id: 'hunt', label: 'Hunt Animal', icon: '🏹' },
    { id: 'team', label: 'Squad Team', icon: '🛡️', badge: `${wallet.teamPetIds?.length || 1}/3` },
    { id: 'battle', label: 'Boss Battle', icon: '⚔️' },
    { id: 'multiplayer', label: 'Online 1v1', icon: '👥', badge: 'PvP' },
    { id: 'chat', label: 'Chat & Bot', icon: '💬', badge: 'Live' },
    { id: 'friends', label: 'Friends & Donate', icon: '🤝', badge: 'Social' },
    { id: 'private_server', label: 'Private Server', icon: '🔒', badge: 'VIP' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '🏆', badge: 'Top 10' },
    { id: 'redeem', label: 'Redeem Code', icon: '🎟️' },
    ...(isDev ? [{ id: 'dev_studio' as ArcadeSubTab, label: 'Dev Studio', icon: '💻', badge: 'Admin' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation in Original HITARTH Style */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-x-auto max-w-full">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                sound.playSlotTick();
                setSubTab(t.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                subTab === t.id
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    subTab === t.id
                      ? 'bg-slate-950 text-amber-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Render Current Sub-Tab */}
      <div>
        {subTab === 'flip' && (
          <CoinFlipGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'slots' && (
          <SlotsGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'highlow' && (
          <HighLowGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'hunt' && (
          <HuntGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'team' && (
          <BattleTeamBuilder
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onProceedToBattle={() => setSubTab('battle')}
          />
        )}
        {subTab === 'battle' && (
          <BattleGame
            wallet={wallet}
            account={account}
            onUpdateWallet={onUpdateWallet}
            onOpenTeamBuilder={() => setSubTab('team')}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'multiplayer' && (
          <MultiplayerHub
            wallet={wallet}
            account={account}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={() => setSubTab('redeem')}
          />
        )}
        {subTab === 'chat' && (
          <ChatBotHub
            wallet={wallet}
            account={account}
            onUpdateWallet={onUpdateWallet}
            onUpdateAccount={onUpdateAccount}
            onOpenAuth={onOpenAuth}
            onOpenDevStudio={() => setSubTab('dev_studio')}
          />
        )}
        {subTab === 'leaderboard' && (
          <Leaderboard
            wallet={wallet}
            account={account}
            onNavigateTab={(tab) => setSubTab(tab)}
            onOpenAuth={onOpenAuth}
          />
        )}
        {subTab === 'friends' && (
          <FriendsHub
            wallet={wallet}
            account={account}
            onUpdateWallet={onUpdateWallet}
            onNavigateTab={(tab) => setSubTab(tab)}
            onOpenAuth={onOpenAuth}
          />
        )}
        {subTab === 'private_server' && (
          <PrivateServerSection
            wallet={wallet}
            account={account}
            onOpenAuth={onOpenAuth}
          />
        )}
        {subTab === 'redeem' && (
          <RedeemCodeSection
            wallet={wallet}
            account={account}
            onUpdateWallet={onUpdateWallet}
            onOpenDeveloperCodeModal={onOpenDeveloperCodeModal}
          />
        )}
        {subTab === 'dev_studio' && (
          <DevStudio
            account={account}
            onBackToChat={() => setSubTab('chat')}
            onGrantDeveloperAccess={() => {}}
          />
        )}
      </div>
    </div>
  );
};
