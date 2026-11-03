import React, { useState } from 'react';
import { UserAccount } from '../types';
import { registerAccount, loginAccount } from '../utils/social';
import { sound } from '../utils/audioSynth';
import {
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  logoutUser,
  syncUserProfile,
} from '../services/firebaseService';
import {
  Shield,
  KeyRound,
  Sparkles,
  User,
  Lock,
  Check,
  AlertCircle,
  Cloud,
  LogOut,
  Mail,
  Loader2,
} from 'lucide-react';
import { auth } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSaved: (account: UserAccount) => void;
  currentAccount?: UserAccount | null;
}

const STARTER_AVATARS = ['⚡', '👑', '🐯', '💎', '🐉', '🦊', '🎯', '🚀', '⚔️', '🦅', '🔥', '🌟'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAccountSaved,
  currentAccount,
}) => {
  const [authMethod, setAuthMethod] = useState<'google' | 'password'>('password');
  const [isLoginMode, setIsLoginMode] = useState<boolean>(false);
  const [inGameName, setInGameName] = useState<string>(currentAccount?.inGameName || '');
  const [password, setPassword] = useState<string>('');
  const [email, setEmail] = useState<string>(currentAccount?.email || '');
  const [avatar, setAvatar] = useState<string>(currentAccount?.avatar || '⚡');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      const displayName = user.displayName?.split(' ')[0] || inGameName || 'HeroPlayer';
      const starterId = currentAccount?.id || `OWO-${Math.floor(1000 + Math.random() * 9000)}`;

      const cloudAccount: UserAccount = {
        id: starterId,
        inGameName: displayName,
        avatar: avatar || '👑',
        createdAt: Date.now(),
        uid: user.uid,
        email: user.email || undefined,
        isCloudSynced: true,
      };

      sound.playJackpot();
      onAccountSaved(cloudAccount);
      onClose();
    } catch (err: unknown) {
      sound.playLoss();
      const msg = err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Standard Account Registration / Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // Try Firebase email login if user typed an email format, else local account check
        const isEmailFormat = inGameName.includes('@');
        let firebaseUid: string | undefined = undefined;

        if (isEmailFormat) {
          try {
            const fUser = await loginWithEmail(inGameName, password);
            firebaseUid = fUser.uid;
          } catch {
            // fallback
          }
        }

        const res = loginAccount(inGameName, password);
        if (res.success && res.account) {
          const isHitarth = res.account.inGameName.toLowerCase() === 'hitarth' || res.account.id === 'OWO-9850';
          const acc: UserAccount = {
            ...res.account,
            id: isHitarth ? 'OWO-9850' : res.account.id,
            isDeveloper: isHitarth || res.account.isDeveloper,
            role: isHitarth ? 'developer' : res.account.role || 'member',
            uid: firebaseUid || res.account.uid,
            isCloudSynced: true,
          };
          sound.playWin();
          onAccountSaved(acc);
          onClose();
        } else {
          sound.playLoss();
          setErrorMsg(res.error || 'Failed to login with provided credentials.');
        }
      } else {
        // Register account
        const res = registerAccount(inGameName, password, avatar);
        if (res.success && res.account) {
          sound.playJackpot();
          const isHitarth = res.account.inGameName.toLowerCase() === 'hitarth' || res.account.id === 'OWO-9850';
          const acc: UserAccount = {
            ...res.account,
            id: isHitarth ? 'OWO-9850' : res.account.id,
            isDeveloper: isHitarth,
            role: isHitarth ? 'developer' : 'member',
            isCloudSynced: true,
          };
          onAccountSaved(acc);
          onClose();
        } else {
          sound.playLoss();
          setErrorMsg(res.error || 'Failed to create account.');
        }
      }
    } catch (err: unknown) {
      sound.playLoss();
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      sound.playCoin();
      // Reset account locally
      onAccountSaved({
        id: `OWO-${Math.floor(1000 + Math.random() * 9000)}`,
        inGameName: 'Guest Player',
        avatar: '⚡',
        createdAt: Date.now(),
        isCloudSynced: false,
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-amber-500/30">
            {avatar}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
            <span>{currentAccount?.isCloudSynced ? 'Firebase Cloud Account' : isLoginMode ? 'In-Game Login' : 'Create In-Game Account'}</span>
            <Cloud className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {currentAccount?.isCloudSynced
              ? 'Your wallet, battle squad, and global leaderboard ranking are synced live to Firebase Firestore.'
              : 'Sign in to save your Indian Rupee fortune, pets, and battle history across all devices!'}
          </p>
        </div>

        {/* Cloud Status Pill if logged in */}
        {currentAccount?.isCloudSynced && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">Firestore Cloud Active:</span>
              <span className="font-mono text-slate-300">{currentAccount.inGameName} ({currentAccount.id})</span>
            </div>
            <button
              onClick={handleSignOut}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-bold border border-rose-800 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Real Google Cloud Sign-In Option */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-lg shadow-white/5 transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer active:scale-98"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign In with Google (Cloud Sync)</span>
          </button>

          {/* Quick Sign In as Hitarth OWO-9850 (Developer) */}
          <button
            type="button"
            onClick={() => {
              const devAccount: UserAccount = {
                id: 'OWO-9850',
                inGameName: 'Hitarth',
                avatar: '👑',
                createdAt: Date.now(),
                isDeveloper: true,
                role: 'developer',
                isCloudSynced: true,
              };
              sound.playJackpot();
              onAccountSaved(devAccount);
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 border border-purple-500/50 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <span>👑</span>
            <span>Sign In as Hitarth (OWO-9850 Developer)</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[11px] uppercase tracking-widest text-slate-500 font-mono">or custom account</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        {/* Custom Account Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* In-Game Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              In-Game Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={inGameName}
                maxLength={18}
                required
                onChange={(e) => setInGameName(e.target.value)}
                placeholder="e.g. RajaRupee, TigerMaster"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-amber-400 pl-10"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Account Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                required
                minLength={3}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold text-sm focus:outline-none focus:border-amber-400 pl-10"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
            <span className="text-[10px] text-slate-500 block">Minimum 3 characters</span>
          </div>

          {/* Avatar Selection (when registering) */}
          {!isLoginMode && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Choose Starter Avatar
              </label>
              <div className="grid grid-cols-6 gap-2 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                {STARTER_AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setAvatar(av);
                      sound.playSlotTick();
                    }}
                    className={`h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                      avatar === av
                        ? 'bg-amber-500 scale-110 shadow-md shadow-amber-500/40 text-slate-950'
                        : 'hover:bg-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-xl shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isLoginMode ? 'Sign In to Account' : 'Create Account & Play'}</span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg(null);
            }}
            className="font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          >
            {isLoginMode
              ? 'New to OwO Arcade? Create an Account'
              : 'Already have an account? Sign In'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
