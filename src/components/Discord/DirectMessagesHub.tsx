import React, { useState } from 'react';
import { UserAccount, FriendUser, FriendRequest, WalletState } from '../../types';
import { sound } from '../../utils/audioSynth';
import { formatJoules, subtractFromWallet } from '../../utils/economy';
import {
  Users,
  UserPlus,
  MessageSquare,
  Send,
  Gift,
  Check,
  X,
  Search,
  Sparkles,
  Crown,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DirectMessagesHubProps {
  account: UserAccount | null;
  wallet: WalletState;
  friends: FriendUser[];
  incomingRequests: FriendRequest[];
  onAddFriend: (targetId: string) => void;
  onAcceptRequest: (req: FriendRequest) => void;
  onDeclineRequest: (reqId: string) => void;
  onUpdateWallet: (newWallet: WalletState) => void;
}

export const DirectMessagesHub: React.FC<DirectMessagesHubProps> = ({
  account,
  wallet,
  friends,
  incomingRequests,
  onAddFriend,
  onAcceptRequest,
  onDeclineRequest,
  onUpdateWallet,
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'add'>('all');
  const [addFriendInput, setAddFriendInput] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<FriendUser | null>(null);
  const [dmMessages, setDmMessages] = useState<Record<string, { sender: string; text: string; time: string }[]>>({});
  const [dmInput, setDmInput] = useState('');
  const [donationAmount, setDonationAmount] = useState('500');
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleSendDM = () => {
    if (!selectedFriend || !dmInput.trim()) return;
    const clean = dmInput.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setDmMessages((prev) => ({
      ...prev,
      [selectedFriend.id]: [
        ...(prev[selectedFriend.id] || []),
        { sender: account?.inGameName || 'Hitarth', text: clean, time },
      ],
    }));

    setDmInput('');
    sound.playCoin();
  };

  const handleSendDonation = () => {
    if (!selectedFriend) return;
    const amt = parseInt(donationAmount.replace(/[^0-9]/g, ''), 10);
    if (isNaN(amt) || amt <= 0 || wallet.balanceINR < amt) {
      sound.playLoss();
      setFeedbackMsg('Insufficient Joules balance.');
      return;
    }

    const sub = subtractFromWallet(wallet, amt, 'Direct Gift', `Sent Joules gift to ${selectedFriend.name}`);
    if (!sub.success) return;

    onUpdateWallet(sub.updatedWallet);
    sound.playJackpot();
    confetti({ particleCount: 70, spread: 60 });
    setShowDonateModal(false);
    setFeedbackMsg(`Successfully sent ⚡ ${formatJoules(amt)} to ${selectedFriend.name}!`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    onAddFriend(addFriendInput.trim());
    setAddFriendInput('');
    setFeedbackMsg('Friend request sent!');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 font-sans">
      {/* Left Direct Messages Sidebar */}
      <div className="w-60 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Direct Messages</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 border-b border-slate-800 flex gap-1 text-[11px] font-bold">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedFriend(null);
            }}
            className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center ${
              activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('pending');
              setSelectedFriend(null);
            }}
            className={`flex-1 py-1 rounded-lg transition-colors cursor-pointer text-center relative ${
              activeTab === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Requests ({incomingRequests.length})
            {incomingRequests.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('add');
              setSelectedFriend(null);
            }}
            className={`px-2 py-1 rounded-lg transition-colors cursor-pointer text-emerald-400 ${
              activeTab === 'add' ? 'bg-emerald-600 text-white' : 'hover:bg-slate-800'
            }`}
          >
            Add
          </button>
        </div>

        {/* Friends DM List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
            DIRECT MESSAGES
          </div>

          {friends.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 space-y-2">
              <p>No friends added yet.</p>
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className="px-3 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold text-xs"
              >
                + Add Friend by ID
              </button>
            </div>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                onClick={() => {
                  setSelectedFriend(friend);
                  sound.playSlotTick();
                }}
                className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                  selectedFriend?.id === friend.id
                    ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                    : 'text-slate-300 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm border border-slate-700">
                      {friend.avatar || '⚡'}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{friend.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{friend.id}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Right Area: DM Conversation or Hub */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {feedbackMsg && (
          <div className="p-2.5 bg-emerald-950/60 border-b border-emerald-800 text-xs text-emerald-300 text-center font-bold">
            {feedbackMsg}
          </div>
        )}

        {selectedFriend ? (
          /* One-on-One DM Chat */
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Bar */}
            <div className="h-14 px-4 border-b border-slate-900 bg-slate-900/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedFriend.avatar || '⚡'}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedFriend.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-400">Online • {selectedFriend.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDonateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-colors"
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Send Joules Gift</span>
                </button>
              </div>
            </div>

            {/* DM Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-center py-6 text-slate-500 text-xs space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-2xl mx-auto border border-slate-800">
                  {selectedFriend.avatar || '⚡'}
                </div>
                <p className="font-bold text-white">This is the start of your direct message history with {selectedFriend.name}.</p>
                <p className="text-[11px]">Messages sent here are private between you two.</p>
              </div>

              {(dmMessages[selectedFriend.id] || []).map((msg, i) => (
                <div key={i} className="flex flex-col gap-0.5 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 max-w-lg">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                    <span>{msg.sender}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
                  </div>
                  <div className="text-xs text-slate-200 mt-1">{msg.text}</div>
                </div>
              ))}
            </div>

            {/* DM Input Bar */}
            <div className="p-3 bg-slate-900/80 border-t border-slate-900 flex gap-2">
              <input
                type="text"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendDM()}
                placeholder={`Message @${selectedFriend.name}...`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendDM}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : activeTab === 'add' ? (
          /* Add Friend Tab */
          <div className="flex-1 p-6 max-w-lg mx-auto flex flex-col justify-center space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Add Friend by Player ID</span>
              </h2>
              <p className="text-xs text-slate-400">
                You can add friends using their unique HITARTH Player Tag (e.g. <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 font-mono">OWO-9850</code>).
              </p>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={addFriendInput}
                  onChange={(e) => setAddFriendInput(e.target.value)}
                  placeholder="Enter Player ID (e.g. OWO-XXXX) or In-Game Name..."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'pending' ? (
          /* Pending Requests */
          <div className="flex-1 p-6 max-w-xl mx-auto space-y-4">
            <h2 className="text-lg font-black text-white">Incoming Friend Requests</h2>
            {incomingRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
                No pending requests.
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{req.fromAvatar || '⚡'}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{req.fromName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{req.fromId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptRequest(req)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeclineRequest(req.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* All Friends */
          <div className="flex-1 p-6 space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>All Friends — {friends.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                + Add Friend
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{friend.avatar || '⚡'}</span>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1">
                          <span>{friend.name}</span>
                          {friend.isDeveloper && <Crown className="w-3 h-3 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{friend.id}</div>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>

                  <div className="text-[11px] text-slate-400 flex justify-between border-t border-slate-800/60 pt-2">
                    <span>Balance: ⚡ {formatJoules(friend.accumulatedINR)}</span>
                    <span>{friend.petEmoji || '🐯'} {friend.petName || 'Companion'}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedFriend(friend)}
                      className="flex-1 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Donation Modal */}
      {showDonateModal && selectedFriend && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-400" />
              <span>Send Joules Gift to {selectedFriend.name}</span>
            </h3>
            <p className="text-xs text-slate-400">
              Your Joules balance: ⚡ <strong>{formatJoules(wallet.balanceINR)}</strong>
            </p>
            <div className="space-y-1">
              <label className="text-xs text-slate-300">Gift Amount (Joules)</label>
              <input
                type="number"
                value={donationAmount}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDonateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendDonation}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
              >
                Confirm Gift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
