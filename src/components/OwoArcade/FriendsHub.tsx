import React, { useState, useEffect } from 'react';
import { UserAccount, FriendUser, WalletState, ArcadeSubTab } from '../../types';
import {
  getStoredFriends,
  saveStoredFriends,
  removeFriend,
  donateRupees,
  getDonationsHistory,
} from '../../utils/social';
import {
  searchUserOnline,
  sendOnlineFriendRequest,
  subscribeIncomingFriendRequests,
  sendFirestoreDonation,
  subscribeIncomingDonations,
} from '../../services/firebaseService';
import { formatINR, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import {
  Users,
  UserPlus,
  HeartHandshake,
  Search,
  Gift,
  Coins,
  Swords,
  Trash2,
  Check,
  AlertCircle,
  Copy,
  Sparkles,
  Cloud,
  CheckCircle,
  Loader2,
  Send,
} from 'lucide-react';

interface FriendsHubProps {
  wallet: WalletState;
  account: UserAccount | null;
  onUpdateWallet: (newWallet: WalletState) => void;
  onNavigateTab: (tab: ArcadeSubTab) => void;
  onOpenAuth: () => void;
}

export const FriendsHub: React.FC<FriendsHubProps> = ({
  wallet,
  account,
  onUpdateWallet,
  onNavigateTab,
  onOpenAuth,
}) => {
  const [friends, setFriends] = useState<FriendUser[]>(() => getStoredFriends());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Incoming Friend Requests (real-time from Firestore)
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);

  // Donation State
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [donationTarget, setDonationTarget] = useState<{ id: string; name: string } | null>(null);
  const [donationAmount, setDonationAmount] = useState<number>(1000);
  const [donationMessage, setDonationMessage] = useState<string>('');
  const [donationFeedback, setDonationFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Sync friends
  useEffect(() => {
    saveStoredFriends(friends);
  }, [friends]);

  // Subscribe to real-time incoming friend requests online
  useEffect(() => {
    if (!account?.id) return;
    const unsub = subscribeIncomingFriendRequests(account.id, (reqs) => {
      setIncomingRequests(reqs);
    });
    return () => unsub();
  }, [account?.id]);

  // Subscribe to real-time incoming rupee donations from friends online
  useEffect(() => {
    if (!account?.id) return;
    const unsub = subscribeIncomingDonations(account.id, (donation) => {
      sound.playJackpot();
      confetti({ particleCount: 150, spread: 80 });

      const updated = addToWallet(
        wallet,
        donation.amount,
        'Donation Received',
        `Received ${formatINR(donation.amount)} from ${donation.fromName}! ${donation.message ? `"${donation.message}"` : ''}`,
        'donation_received'
      );
      onUpdateWallet(updated);
    });
    return () => unsub();
  }, [account?.id, wallet]);

  const handleSearchAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      onOpenAuth();
      return;
    }

    const clean = searchQuery.trim();
    if (!clean) {
      setSearchFeedback({ success: false, message: 'Please enter a Player ID (e.g. OWO-1234) or In-Game Name.' });
      return;
    }

    if (clean.toUpperCase() === account.id.toUpperCase()) {
      setSearchFeedback({ success: false, message: 'You cannot add your own Player ID as a friend.' });
      return;
    }

    setIsSearchingOnline(true);
    setSearchFeedback(null);

    try {
      // 1. Search online in Firebase Firestore
      const onlineUser = await searchUserOnline(clean);

      if (onlineUser) {
        // Send online friend request to Firestore
        await sendOnlineFriendRequest(account, onlineUser.id);

        // Add to friends list
        const updated = [...friends.filter((f) => f.id !== onlineUser.id), onlineUser];
        setFriends(updated);

        sound.playJackpot();
        confetti({ particleCount: 80, spread: 60 });
        setSearchFeedback({
          success: true,
          message: `Live player "${onlineUser.name}" (${onlineUser.id}) found on Firestore and added to your friend list!`,
        });
        setSearchQuery('');
        return;
      }

      sound.playLoss();
      setSearchFeedback({
        success: false,
        message: `No online player found with ID or name "${clean}". Ask your friend to sign in and share their exact OwO tag (e.g. OWO-XXXX)!`,
      });
    } catch (err) {
      sound.playLoss();
      setSearchFeedback({
        success: false,
        message: 'Search failed. Please verify your connection.',
      });
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleAcceptIncomingRequest = (req: any) => {
    const newFriend: FriendUser = {
      id: req.fromId,
      name: req.fromName,
      avatar: req.fromAvatar || '⚡',
      accumulatedINR: 50000,
      status: 'online',
      addedAt: Date.now(),
    };

    const updated = [...friends.filter((f) => f.id !== newFriend.id), newFriend];
    setFriends(updated);
    setIncomingRequests((prev) => prev.filter((r) => r.id !== req.id));

    sound.playJackpot();
    confetti({ particleCount: 100, spread: 70 });
  };



  const handleRemoveFriend = (friendId: string) => {
    const updated = removeFriend(friendId);
    setFriends(updated);
    sound.playSlotTick();
  };

  const handleOpenDonateModal = (target: { id: string; name: string }) => {
    setDonationTarget(target);
    setDonationAmount(1000);
    setDonationMessage('');
    setDonationFeedback(null);
    setIsDonating(true);
  };

  const handleExecuteDonation = async () => {
    if (!account) {
      onOpenAuth();
      return;
    }
    if (!donationTarget) return;

    if (wallet.balanceINR < donationAmount) {
      sound.playLoss();
      setDonationFeedback({
        success: false,
        message: `Insufficient balance! You need ${formatINR(donationAmount)} to complete this donation.`,
      });
      return;
    }

    // Deduct from local wallet
    const updatedWallet: WalletState = {
      ...wallet,
      balanceINR: wallet.balanceINR - donationAmount,
      transactions: [
        {
          id: `tx_don_${Date.now()}`,
          type: 'donation_sent',
          game: 'Donation',
          amount: -donationAmount,
          timestamp: Date.now(),
          note: `Donated ${formatINR(donationAmount)} to ${donationTarget.name} (${donationTarget.id})`,
        },
        ...wallet.transactions,
      ],
    };
    onUpdateWallet(updatedWallet);

    // Send online to Firestore
    await sendFirestoreDonation(
      account.uid || account.id,
      account.inGameName,
      donationTarget.id,
      donationAmount,
      donationMessage.trim() || undefined
    );

    sound.playJackpot();
    confetti({ particleCount: 120, spread: 70 });
    setDonationFeedback({
      success: true,
      message: `Successfully transferred ${formatINR(donationAmount)} to ${donationTarget.name} (${donationTarget.id}) over Firestore!`,
    });

    setTimeout(() => {
      setIsDonating(false);
    }, 2000);
  };

  const copyMyId = () => {
    if (!account) return;
    navigator.clipboard.writeText(account.id);
    setCopiedId(true);
    sound.playSlotTick();
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/70 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Real-Time Firebase Online Social Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Friends & Rupee Donations</span>
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl">
              Search real player IDs across the internet, send cloud friend requests, challenge friends to 1v1 PvP duels, or donate Indian Rupees (₹) to support their journey!
            </p>
          </div>

          {/* User Account ID Pill */}
          {account ? (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-indigo-500/40 text-center sm:text-left space-y-1">
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Your OwO Player ID</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-mono text-amber-400">{account.id}</span>
                <button
                  onClick={copyMyId}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Copy Your ID to share with friends"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className="text-xs text-indigo-300 block font-bold">
                {account.avatar} {account.inGameName}
              </span>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="py-3 px-6 rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 cursor-pointer"
            >
              Sign In to Get Player ID
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Incoming Friend Requests Alert */}
      {incomingRequests.length > 0 && (
        <div className="p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/60 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Incoming Cloud Friend Requests ({incomingRequests.length})</span>
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Live from Firestore
            </span>
          </div>

          <div className="divide-y divide-indigo-900/60">
            {incomingRequests.map((req) => (
              <div key={req.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{req.fromAvatar || '⚡'}</span>
                  <div>
                    <span className="font-bold text-white text-sm">{req.fromName}</span>
                    <span className="text-xs text-indigo-300 block font-mono">{req.fromId}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleAcceptIncomingRequest(req)}
                  className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  Accept & Add Friend
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Online Search & Add Form */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center gap-2">
          <Search className="w-4 h-4 text-amber-400" />
          <span>Search Player ID Online & Add Friend</span>
        </h3>

        <form onSubmit={handleSearchAndAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by OwO Player ID (e.g. OWO-8888, OWO-7721) or In-Game Name..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-medium text-sm focus:outline-none focus:border-indigo-400 pl-11"
            />
            <Search className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          <button
            type="submit"
            disabled={isSearchingOnline}
            className="py-3 px-6 rounded-2xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isSearchingOnline ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>{isSearchingOnline ? 'Searching Online...' : 'Add Friend'}</span>
          </button>
        </form>

        {searchFeedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              searchFeedback.success
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {searchFeedback.success ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{searchFeedback.message}</span>
          </div>
        )}
      </div>

      {/* Friends List */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Your Friends List ({friends.length})</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">1v1 PvP & Donations</span>
        </div>

        {friends.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <span className="text-4xl block">👥</span>
            <p className="text-sm font-bold text-white">No friends added yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Search your friend's OwO Player ID above, or quick add community champions below to challenge them or donate rupees!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{friend.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-sm">{friend.name}</span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                      </div>
                      <span className="text-xs font-mono font-bold text-indigo-300 block">
                        {friend.id}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove Friend"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <div className="font-mono text-slate-400">
                    Net: <strong className="text-amber-300">{formatINR(friend.accumulatedINR)}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenDonateModal(friend)}
                      className="px-2.5 py-1 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Gift className="w-3 h-3" />
                      <span>Donate</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playSlotTick();
                        onNavigateTab('multiplayer');
                      }}
                      className="px-2.5 py-1 rounded-lg font-bold bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Swords className="w-3 h-3" />
                      <span>Duel</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Rupee Donation Modal */}
      {isDonating && donationTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-lg">Donate Indian Rupees</h3>
              </div>
              <button
                onClick={() => setIsDonating(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* Recipient Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Recipient</span>
                <span className="font-extrabold text-sm text-white">{donationTarget.name}</span>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {donationTarget.id}
              </span>
            </div>

            {/* Quick Amount Selector */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-400 uppercase">Donation Amount</span>
                <span className="text-slate-400">
                  Wallet: <strong className="text-amber-300 font-mono">{formatINR(wallet.balanceINR)}</strong>
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[500, 1000, 5000, 25000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDonationAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      donationAmount === amt
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {formatINR(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Note / Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Optional Message
              </label>
              <input
                type="text"
                maxLength={60}
                value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)}
                placeholder="e.g. Good luck in your boss battle!"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Feedback alert */}
            {donationFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  donationFeedback.success
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                }`}
              >
                {donationFeedback.success ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                <span>{donationFeedback.message}</span>
              </div>
            )}

            {/* Send Donation Button */}
            <button
              onClick={handleExecuteDonation}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4" />
              <span>SEND ONLINE DONATION OF {formatINR(donationAmount)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
