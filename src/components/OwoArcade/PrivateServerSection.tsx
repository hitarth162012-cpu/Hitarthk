import React, { useState, useEffect } from 'react';
import { UserAccount, PrivateServer, WalletState } from '../../types';
import {
  getStoredPrivateServers,
  saveStoredPrivateServers,
  getActivePrivateServer,
  setActivePrivateServer,
  accessPrivateServer,
  createPrivateServer,
} from '../../utils/social';
import {
  saveOnlinePrivateServer,
  getOnlinePrivateServer,
  subscribeOnlinePrivateServers,
} from '../../services/firebaseService';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import {
  Server,
  Lock,
  KeyRound,
  Shield,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  PlusCircle,
  LogOut,
  Users,
  Cloud,
  Loader2,
} from 'lucide-react';

interface PrivateServerSectionProps {
  wallet: WalletState;
  account: UserAccount | null;
  onOpenAuth: () => void;
}

export const PrivateServerSection: React.FC<PrivateServerSectionProps> = ({
  wallet,
  account,
  onOpenAuth,
}) => {
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  const [activeServer, setActiveServerState] = useState<PrivateServer | null>(() => getActivePrivateServer());
  const [servers, setServers] = useState<PrivateServer[]>(() => getStoredPrivateServers());
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Create Server Form State
  const [isCreatingServer, setIsCreatingServer] = useState<boolean>(false);
  const [newServerName, setNewServerName] = useState<string>('');
  const [newServerCode, setNewServerCode] = useState<string>('');
  const [newServerWelcome, setNewServerWelcome] = useState<string>('');

  useEffect(() => {
    setActivePrivateServer(activeServer);
  }, [activeServer]);

  // Subscribe to real-time online private servers from Firestore
  useEffect(() => {
    const unsub = subscribeOnlinePrivateServers((cloudServers) => {
      setServers(cloudServers);
    });
    return () => unsub();
  }, []);

  const handleConnectServer = async (codeToConnect?: string) => {
    const code = (codeToConnect || accessCodeInput).trim().toUpperCase();
    if (!code) {
      setFeedback({ success: false, message: 'Please enter a private server access code.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      // 1. Check online Firestore private servers
      const onlineServer = await getOnlinePrivateServer(code);
      if (onlineServer) {
        sound.playJackpot();
        confetti({ particleCount: 100, spread: 60 });
        setActiveServerState(onlineServer);
        setFeedback({
          success: true,
          message: `Connected to Cloud Private Server "${onlineServer.name}"! +${Math.round((onlineServer.perkMultiplier - 1) * 100)}% reward perk active!`,
        });
        setAccessCodeInput('');
        return;
      }

      // 2. Fallback to local servers
      const res = accessPrivateServer(code);
      if (res.success && res.server) {
        sound.playJackpot();
        confetti({ particleCount: 100, spread: 60 });
        setActiveServerState(res.server);
        setFeedback({
          success: true,
          message: `Connected to Private Server "${res.server.name}"! +${Math.round((res.server.perkMultiplier - 1) * 100)}% reward perk active!`,
        });
        setAccessCodeInput('');
      } else {
        sound.playLoss();
        setFeedback({
          success: false,
          message: res.error || 'Server code not recognized online or locally.',
        });
      }
    } catch {
      sound.playLoss();
      setFeedback({ success: false, message: 'Failed to connect to server.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateServerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      onOpenAuth();
      return;
    }

    const cleanCode = newServerCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      setFeedback({ success: false, message: 'Please enter a valid alphanumeric server code.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const server: PrivateServer = {
        id: `srv_${Date.now()}_${cleanCode}`,
        code: cleanCode,
        name: newServerName.trim() || `${account.inGameName}'s Realm`,
        ownerId: account.id,
        ownerName: account.inGameName,
        perkMultiplier: 1.25,
        activePlayersCount: 1,
        createdAt: Date.now(),
        welcomeMessage: newServerWelcome.trim() || `Welcome to ${newServerName}! Enjoy 25% extra win rewards!`,
      };

      // Save online to Firestore
      await saveOnlinePrivateServer(server);

      // Save locally
      createPrivateServer(account, newServerName, cleanCode, newServerWelcome);

      sound.playJackpot();
      confetti({ particleCount: 120, spread: 70 });
      setActiveServerState(server);
      setIsCreatingServer(false);
      setNewServerName('');
      setNewServerCode('');
      setNewServerWelcome('');
      setFeedback({
        success: true,
        message: `Cloud Private Server "${server.name}" is now live online! Share Code: ${server.code}`,
      });
    } catch (err) {
      sound.playLoss();
      setFeedback({ success: false, message: 'Failed to create online private server.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setActiveServerState(null);
    sound.playSlotTick();
    setFeedback({ success: true, message: 'Disconnected from private server. Returned to public server.' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-950/70 via-slate-900 to-indigo-950/70 border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span>Firebase Firestore Online Private Servers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Private Server Access & Perks</span>
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-xl">
              Enter a secret access code to enter a private online realm. Enjoy private 1v1 lobbies, exclusive chat rooms, and <strong className="text-amber-300">up to 25% bonus Indian Rupee rewards</strong> on all arcade games!
            </p>
          </div>

          {activeServer ? (
            <div className="bg-emerald-950/80 p-4 rounded-2xl border border-emerald-600/60 text-center sm:text-left space-y-2">
              <span className="text-[10px] text-emerald-400 block uppercase font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Active Online Server
              </span>
              <div className="font-extrabold text-white text-base">{activeServer.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono font-bold">
                  Code: {activeServer.code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  +{Math.round((activeServer.perkMultiplier - 1) * 100)}% Win Perk
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-800/40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect to Public</span>
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center sm:text-left space-y-1">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Current Server</span>
              <span className="text-base font-extrabold text-white block">🌐 Global Public Arcade</span>
              <span className="text-xs text-slate-400 block">Default reward multipliers active</span>
            </div>
          )}
        </div>
      </div>

      {/* Access Code Input Section */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="font-extrabold text-white text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Enter Online Private Server Code</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={accessCodeInput}
              onChange={(e) => setAccessCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter secret code (e.g. VIP777, OWO999, HIGHROLLER)..."
              maxLength={12}
              className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm tracking-wider focus:outline-none focus:border-amber-400 pl-11 uppercase"
            />
            <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
          </div>

          <button
            onClick={() => handleConnectServer()}
            disabled={isLoading}
            className="py-3 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Shield className="w-4 h-4" />}
            <span>Connect to Server</span>
          </button>

          <button
            onClick={() => setIsCreatingServer(!isCreatingServer)}
            className="py-3 px-5 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>{isCreatingServer ? 'Close Creator' : 'Host New Server'}</span>
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
              feedback.success
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {feedback.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Create Private Server Form Modal/Drawer */}
      {isCreatingServer && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/40 shadow-2xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="font-extrabold text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Host Your Own Cloud Private Server</span>
            </h4>
            <span className="text-xs text-amber-300 font-mono">+25% Win Multiplier</span>
          </div>

          <form onSubmit={handleCreateServerSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={24}
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="e.g. Royal VIP Palace"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Secret Entry Code (Share with friends)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={newServerCode}
                  onChange={(e) => setNewServerCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MYSECRET77"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-400 uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Welcome Message
              </label>
              <input
                type="text"
                maxLength={80}
                value={newServerWelcome}
                onChange={(e) => setNewServerWelcome(e.target.value)}
                placeholder="e.g. Welcome friends! Free 25% reward boost active here!"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreatingServer(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl font-black text-xs bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                Launch Cloud Server
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Available Known & Cloud Online Servers */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-white text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            <span>Available Online Private Realms</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Live Firestore List</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {servers.map((srv) => {
            const isConnected = activeServer?.code === srv.code;
            return (
              <div
                key={srv.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                  isConnected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/40'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-sm">{srv.name}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      +{Math.round((srv.perkMultiplier - 1) * 100)}% Win Perk
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{srv.welcomeMessage}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <span className="font-mono text-slate-400">
                    Code: <strong className="text-white font-bold">{srv.code}</strong>
                  </span>

                  {isConnected ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnectServer(srv.code)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white transition-all cursor-pointer"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
