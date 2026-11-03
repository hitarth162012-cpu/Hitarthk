import React, { useState, useEffect } from 'react';
import { CustomGameCode, UserAccount } from '../types';
import {
  getDeveloperCodes,
  generateDeveloperCode,
  updateDeveloperCode,
  deleteDeveloperCode,
  isUserDeveloper,
} from '../utils/customCodeService';
import { formatJoules } from '../utils/economy';
import { sound } from '../utils/audioSynth';

interface DeveloperCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  onCodeCreatedOrUpdated?: () => void;
}

const COMPANION_OPTIONS = [
  { name: 'None (Joules & XP Only)', emoji: '❌', rarity: 'common' as const, power: 0 },
  { name: 'Royal Bengal Tiger', emoji: '🐯', rarity: 'legendary' as const, power: 95 },
  { name: 'Cybernetic Phoenix', emoji: '🔥', rarity: 'mythic' as const, power: 120 },
  { name: 'Snow Leopard', emoji: '🐆', rarity: 'epic' as const, power: 85 },
  { name: 'Asian Elephant', emoji: '🐘', rarity: 'rare' as const, power: 80 },
  { name: 'Ancient Golden Dragon', emoji: '🐉', rarity: 'mythic' as const, power: 130 },
  { name: 'White Apex Tiger', emoji: '🐅', rarity: 'legendary' as const, power: 98 },
];

export const DeveloperCodeModal: React.FC<DeveloperCodeModalProps> = ({
  isOpen,
  onClose,
  account,
  onCodeCreatedOrUpdated,
}) => {
  const isDev = isUserDeveloper(account);

  const [codes, setCodes] = useState<CustomGameCode[]>([]);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);

  // Form Fields (Customizable numbers and text with permanent label headers)
  const [codeName, setCodeName] = useState('');
  const [rewardJoules, setRewardJoules] = useState<number>(25000);
  const [rewardXP, setRewardXP] = useState<number>(250);
  const [selectedCompanionIdx, setSelectedCompanionIdx] = useState<number>(0);
  const [maxUses, setMaxUses] = useState<number>(0); // 0 = unlimited
  const [notes, setNotes] = useState('');

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && isDev) {
      setCodes(getDeveloperCodes(true));
      setStatusMsg(null);
    }
  }, [isOpen, isDev]);

  if (!isOpen) return null;

  const refreshCodes = () => {
    setCodes(getDeveloperCodes(true));
    if (onCodeCreatedOrUpdated) onCodeCreatedOrUpdated();
  };

  const resetForm = () => {
    setEditingCodeId(null);
    setCodeName('');
    setRewardJoules(25000);
    setRewardXP(250);
    setSelectedCompanionIdx(0);
    setMaxUses(0);
    setNotes('');
  };

  const handleStartEdit = (code: CustomGameCode) => {
    setEditingCodeId(code.id);
    setCodeName(code.code);
    setRewardJoules(code.rewardJoules);
    setRewardXP(code.rewardXP);
    const compIdx = COMPANION_OPTIONS.findIndex((c) => c.name === code.bonusPetName);
    setSelectedCompanionIdx(compIdx >= 0 ? compIdx : 0);
    setMaxUses(code.maxUses || 0);
    setNotes(code.notes || '');
    setStatusMsg(null);
    sound.playSlotTick();
  };

  const handleSaveOrGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const comp = COMPANION_OPTIONS[selectedCompanionIdx];

    if (editingCodeId) {
      // Update existing code
      const res = await updateDeveloperCode(
        editingCodeId,
        {
          code: codeName,
          rewardJoules: Number(rewardJoules) || 0,
          rewardXP: Number(rewardXP) || 0,
          bonusPetName: comp.power > 0 ? comp.name : undefined,
          bonusPetEmoji: comp.power > 0 ? comp.emoji : undefined,
          bonusPetRarity: comp.power > 0 ? comp.rarity : undefined,
          bonusPetPower: comp.power > 0 ? comp.power : undefined,
          maxUses: Number(maxUses) || 0,
          notes,
        },
        account
      );

      if (!res.success) {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to update code.' });
        sound.playLoss();
        return;
      }

      setStatusMsg({ type: 'success', text: `Code "${res.code?.code}" updated successfully!` });
      sound.playJackpot();
      resetForm();
      refreshCodes();
    } else {
      // Generate new code
      const res = await generateDeveloperCode(
        {
          code: codeName,
          rewardJoules: Number(rewardJoules) || 0,
          rewardXP: Number(rewardXP) || 0,
          bonusPetName: comp.power > 0 ? comp.name : undefined,
          bonusPetEmoji: comp.power > 0 ? comp.emoji : undefined,
          bonusPetRarity: comp.power > 0 ? comp.rarity : undefined,
          bonusPetPower: comp.power > 0 ? comp.power : undefined,
          maxUses: Number(maxUses) || 0,
          notes,
        },
        account
      );

      if (!res.success) {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to create code.' });
        sound.playLoss();
        return;
      }

      setStatusMsg({ type: 'success', text: `Secret code "${res.code?.code}" generated! Visible only to developer.` });
      sound.playJackpot();
      resetForm();
      refreshCodes();
    }
  };

  const handleToggleActive = async (code: CustomGameCode) => {
    const res = await updateDeveloperCode(code.id, { isActive: !code.isActive }, account);
    if (res.success) {
      refreshCodes();
      sound.playCoin();
    }
  };

  const handleDelete = async (codeId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete secret code "${name}"?`)) return;
    const res = await deleteDeveloperCode(codeId, account);
    if (res.success) {
      if (editingCodeId === codeId) resetForm();
      refreshCodes();
      sound.playLoss();
    }
  };

  const handleCopy = (codeStr: string) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCode(codeStr);
    sound.playCoin();
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl shadow-purple-950/50 flex flex-col max-h-[92vh] overflow-hidden text-slate-100 font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-xl sm:text-2xl shadow-inner">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  HITARTH DEVELOPER CODE VAULT
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  DEVELOPER ONLY
                </span>
              </div>
              <p className="text-xs text-purple-300/80">
                Codes are hidden from public view • Can be redeemed by all players
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Access Denied Guard if not developer */}
        {!isDev ? (
          <div className="p-6 text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h4 className="text-lg font-bold text-red-400">Restricted Access</h4>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Custom game codes can only be generated and viewed by the Developer (<span className="text-amber-400 font-bold">Hitarth OWO-9850</span>). Regular users can redeem codes via the chat or the Redeem modal.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Status Alert */}
            {statusMsg && (
              <div
                className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                }`}
              >
                <span>{statusMsg.text}</span>
                <button onClick={() => setStatusMsg(null)} className="ml-2 font-bold hover:text-white">✕</button>
              </div>
            )}

            {/* GENERATOR / EDITOR FORM */}
            <form onSubmit={handleSaveOrGenerate} className="bg-slate-950/70 border border-purple-500/30 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 text-sm">⚡</span>
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-purple-200">
                    {editingCodeId ? 'EDIT EXISTING CODE' : 'CREATE CUSTOM GAME CODE'}
                  </span>
                </div>
                {editingCodeId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-400 hover:text-amber-400 underline"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Field 1: Permanent Label - CODE NAME */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-300">
                    CODE NAME / SECRET PROMO KEY <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={codeName}
                      onChange={(e) => setCodeName(e.target.value.toUpperCase())}
                      placeholder="e.g. HITARTH_SUPER_2026"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-3.5 py-2 text-sm text-white font-mono uppercase tracking-wider outline-none placeholder-slate-500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Secret key players type to claim. Letters, numbers, hyphens, and underscores only.
                  </p>
                </div>

                {/* Field 2: Permanent Label - JOULES REWARD */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                    JOULES REWARD AMOUNT <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={rewardJoules}
                    onChange={(e) => setRewardJoules(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-3.5 py-2 text-sm text-amber-300 font-bold outline-none"
                    required
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setRewardJoules(amt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          rewardJoules === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'
                        }`}
                      >
                        +{formatJoules(amt).replace(' Joules', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 3: Permanent Label - XP REWARD */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">
                    EXPERIENCE (XP) REWARD
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={rewardXP}
                    onChange={(e) => setRewardXP(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-lg px-3.5 py-2 text-sm text-cyan-300 font-bold outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[100, 250, 500, 1000].map((xpAmt) => (
                      <button
                        key={xpAmt}
                        type="button"
                        onClick={() => setRewardXP(xpAmt)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                          rewardXP === xpAmt
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/50'
                        }`}
                      >
                        +{xpAmt} XP
                      </button>
                    ))}
                  </div>
                </div>

                {/* Field 4: Permanent Label - COMPANION PET REWARD */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                    COMPANION PET REWARD
                  </label>
                  <select
                    value={selectedCompanionIdx}
                    onChange={(e) => setSelectedCompanionIdx(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none"
                  >
                    {COMPANION_OPTIONS.map((opt, idx) => (
                      <option key={opt.name} value={idx}>
                        {opt.emoji} {opt.name} {opt.power > 0 ? `(${opt.power} PWR • ${opt.rarity.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 5: Permanent Label - MAX REDEMPTIONS LIMIT */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    MAX REDEMPTIONS LIMIT
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    placeholder="0 = Unlimited players"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-3.5 py-2 text-sm text-white outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    {maxUses === 0 ? 'Unlimited redemptions' : `Caps at first ${maxUses} players`}
                  </p>
                </div>

                {/* Field 6: Permanent Label - DEVELOPER MEMO / NOTE */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    DEVELOPER MEMO / DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Special community reward code from Hitarth"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-3.5 py-2 text-sm text-slate-200 outline-none placeholder-slate-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {editingCodeId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Discard Changes
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-purple-900/40 transition active:scale-95"
                >
                  {editingCodeId ? '💾 Save Updated Code' : '⚡ Generate Secret Code'}
                </button>
              </div>
            </form>

            {/* HIDDEN CODES VAULT LIST (VISIBLE ONLY TO DEVELOPER) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">🛡️</span>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                    SECRET CODES DIRECTORY ({codes.length})
                  </h4>
                </div>
                <span className="text-[11px] text-purple-400 font-mono">
                  Hidden from regular users
                </span>
              </div>

              {codes.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-sm">
                  No custom codes found. Generate your first developer code above!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {codes.map((code) => {
                    const isCopied = copiedCode === code.code;
                    return (
                      <div
                        key={code.id}
                        className={`p-3.5 sm:p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          code.isActive
                            ? 'bg-slate-950/60 border-slate-800 hover:border-purple-500/40'
                            : 'bg-slate-950/30 border-red-900/30 opacity-75'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-base text-amber-300 tracking-wider">
                              {code.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                code.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {code.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Redemptions: <strong className="text-white">{code.redeemedCount}</strong>
                              {code.maxUses && code.maxUses > 0 ? ` / ${code.maxUses}` : ' (Unlimited)'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300">
                            <span className="text-amber-400 font-semibold">
                              ⚡ {formatJoules(code.rewardJoules)}
                            </span>
                            {code.rewardXP > 0 && (
                              <span className="text-cyan-400 font-semibold">
                                ✨ +{code.rewardXP} XP
                              </span>
                            )}
                            {code.bonusPetName && (
                              <span className="text-emerald-400 font-semibold">
                                {code.bonusPetEmoji || '🐾'} {code.bonusPetName} [{code.bonusPetRarity?.toUpperCase()}]
                              </span>
                            )}
                          </div>

                          {code.notes && (
                            <p className="text-[11px] text-slate-400 italic truncate">
                              "{code.notes}"
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(code.code)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                            title="Copy code to share with players"
                          >
                            {isCopied ? '✓ Copied' : '📋 Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(code)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900 text-xs font-semibold text-indigo-300 border border-indigo-700/40 transition"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(code)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              code.isActive
                                ? 'bg-amber-950/40 hover:bg-amber-900 text-amber-300 border-amber-700/40'
                                : 'bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 border-emerald-700/40'
                            }`}
                          >
                            {code.isActive ? 'Pause' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(code.id, code.code)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900 text-rose-300 border border-rose-800/40 transition"
                            title="Delete Code"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/80 border-t border-purple-500/20 flex items-center justify-between text-xs text-slate-400">
          <span>Protected Developer Authority • Hitarth (OWO-9850)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
