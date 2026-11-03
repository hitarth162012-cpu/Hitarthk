import React, { useState, useEffect } from 'react';
import { UserAccount, WalletState, FriendUser, FriendRequest, ArcadeSubTab } from './types';
import { INITIAL_WALLET } from './utils/economy';
import {
  getStoredAccount,
  saveStoredAccount,
  getStoredFriends,
  saveStoredFriends,
  getStoredFriendRequests,
  saveStoredFriendRequests,
} from './utils/social';
import { sound } from './utils/audioSynth';
import { Header } from './components/Header';
import { ArcadeHub } from './components/OwoArcade/ArcadeHub';
import { ProfileModal } from './components/ProfileModal';
import { RedeemCodeModal } from './components/RedeemCodeModal';
import { DeveloperCodeModal } from './components/DeveloperCodeModal';
import { WalletModal } from './components/WalletModal';
import { AuthModal } from './components/AuthModal';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  syncUserProfile,
  saveWalletToFirestore,
  searchUserOnline,
  sendOnlineFriendRequest,
  subscribeIncomingFriendRequests,
} from './services/firebaseService';

const STORAGE_KEY = 'cinenova_owo_wallet_v4';

// Default Hitarth Developer Account (Requirement: "Only make the developer Hitarth OWO-9850")
const DEFAULT_HITARTH_ACCOUNT: UserAccount = {
  id: 'OWO-9850',
  inGameName: 'Hitarth',
  avatar: '👑',
  createdAt: Date.now(),
  isDeveloper: true,
  role: 'developer',
  isCloudSynced: true,
};

export default function App() {
  const [account, setAccount] = useState<UserAccount>(() => {
    const saved = getStoredAccount();
    if (saved) {
      if (saved.inGameName.toLowerCase() === 'hitarth' || saved.id === 'OWO-9850') {
        saved.isDeveloper = true;
        saved.role = 'developer';
        saved.id = 'OWO-9850';
      }
      return saved;
    }
    // Default to Hitarth OWO-9850
    return DEFAULT_HITARTH_ACCOUNT;
  });

  const [activeSubTab, setActiveSubTab] = useState<ArcadeSubTab>('flip');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState<boolean>(false);
  const [isDevCodeModalOpen, setIsDevCodeModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Friends & Incoming Requests
  const [friends, setFriends] = useState<FriendUser[]>(() => getStoredFriends());
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>(() =>
    getStoredFriendRequests()
  );

  // Initialize wallet from localStorage, preserving existing balance and pets
  const [wallet, setWallet] = useState<WalletState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.teamPetIds || parsed.teamPetIds.length === 0) {
          parsed.teamPetIds = ['starter_cub'];
        }
        if (!parsed.inventory) {
          parsed.inventory = INITIAL_WALLET.inventory;
        }
        if (parsed.level === undefined) {
          parsed.level = 1;
          parsed.xp = 0;
        }
        return {
          ...INITIAL_WALLET,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return INITIAL_WALLET;
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const currentAcc = account || DEFAULT_HITARTH_ACCOUNT;
        const cloudProfile = await syncUserProfile(firebaseUser, currentAcc, wallet);

        if (cloudProfile) {
          const isDev =
            cloudProfile.inGameName.toLowerCase() === 'hitarth' ||
            cloudProfile.playerId === 'OWO-9850';

          const updatedAcc: UserAccount = {
            id: isDev ? 'OWO-9850' : cloudProfile.playerId || currentAcc.id,
            inGameName: cloudProfile.inGameName || currentAcc.inGameName,
            avatar: cloudProfile.avatar || currentAcc.avatar,
            createdAt: currentAcc.createdAt,
            uid: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            isCloudSynced: true,
            isDeveloper: isDev || currentAcc.isDeveloper,
            role: isDev ? 'developer' : 'member',
          };

          setAccount(updatedAcc);
          saveStoredAccount(updatedAcc);

          if (cloudProfile.balanceINR > wallet.balanceINR) {
            setWallet((prev) => ({
              ...prev,
              balanceINR: cloudProfile.balanceINR,
              pets: cloudProfile.pets && cloudProfile.pets.length > 0 ? cloudProfile.pets : prev.pets,
            }));
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to incoming friend requests in Firestore
  useEffect(() => {
    if (!account?.id) return;
    const unsub = subscribeIncomingFriendRequests(account.id, (reqs) => {
      if (reqs.length > 0) {
        setIncomingRequests(reqs);
        saveStoredFriendRequests(reqs);
      }
    });
    return () => unsub();
  }, [account?.id]);

  // Audio mute sync
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleUpdateWallet = (newWallet: WalletState) => {
    setWallet(newWallet);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWallet));
    } catch {
      // fallback
    }

    // Background cloud sync
    if (account?.uid) {
      saveWalletToFirestore(account.uid, newWallet, account);
    }
  };

  const handleUpdateAccount = (newAcc: UserAccount) => {
    // Maintain developer role if Hitarth / OWO-9850
    if (newAcc.id === 'OWO-9850' || newAcc.inGameName.toLowerCase() === 'hitarth') {
      newAcc.id = 'OWO-9850';
      newAcc.isDeveloper = true;
      newAcc.role = 'developer';
    }
    setAccount(newAcc);
    saveStoredAccount(newAcc);
    if (newAcc.uid) {
      saveWalletToFirestore(newAcc.uid, wallet, newAcc);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. ORIGINAL HITARTH HEADER */}
      <Header
        balanceINR={wallet.balanceINR}
        account={account}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenRedeem={() => setIsRedeemModalOpen(true)}
        onOpenLeaderboard={() => setActiveSubTab('leaderboard')}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenDevCodeModal={() => setIsDevCodeModalOpen(true)}
        onOpenDevStudio={() => setActiveSubTab('dev_studio')}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 2. MAIN ORIGINAL HITARTH NAVIGATION & CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 w-full flex-1">
        <ArcadeHub
          wallet={wallet}
          account={account}
          onUpdateWallet={handleUpdateWallet}
          onUpdateAccount={handleUpdateAccount}
          activeSubTab={activeSubTab}
          onSubTabChange={setActiveSubTab}
          onOpenAuth={() => setIsProfileModalOpen(true)}
          onOpenDeveloperCodeModal={() => setIsDevCodeModalOpen(true)}
        />
      </main>

      {/* 3. ORIGINAL HITARTH FOOTER */}
      <footer className="mt-12 py-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2.5 bg-slate-950/80">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-400 font-medium px-4">
          <span>🪙 HITARTH OwO Indian Rupee (₹) Arcade</span>
          <span>•</span>
          <span>💬 Real-Time Live Game Bot & Chat</span>
          <span>•</span>
          <span>👥 In-Game Friends & Rupee Donations</span>
          <span>•</span>
          <span>🔒 Private Server Access</span>
          <span>•</span>
          <span>🛡️ 3-Pet Battle Squads</span>
          <span>•</span>
          <span>☁️ Firebase Firestore Powered</span>
        </div>
        <p className="text-slate-600 px-4">
          © 2026 HITARTH. Indian Rupee & Joules minigames with live multiplayer, player IDs, and secret promo codes.
        </p>
      </footer>

      {/* 4. MODALS */}
      {/* Comprehensive Profile Modal (opens when clicking our icon) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        account={account}
        wallet={wallet}
        onUpdateAccount={handleUpdateAccount}
        onOpenRedeemModal={() => setIsRedeemModalOpen(true)}
        onOpenDevCodeModal={() => setIsDevCodeModalOpen(true)}
      />

      {/* Public Secret Code Redemption Modal */}
      <RedeemCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={handleUpdateWallet}
        account={account}
        onOpenDeveloperCodeModal={() => setIsDevCodeModalOpen(true)}
      />

      {/* Developer Secret Code Vault & Generator Modal (ONLY Hitarth OWO-9850) */}
      <DeveloperCodeModal
        isOpen={isDevCodeModalOpen}
        onClose={() => setIsDevCodeModalOpen(false)}
        account={account}
      />

      {/* Virtual Wallet Ledger Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={handleUpdateWallet}
        initialCode=""
      />

      {/* Account Settings & Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentAccount={account}
        onAccountSaved={(acc) => {
          handleUpdateAccount(acc);
        }}
      />

    </div>
  );
}
