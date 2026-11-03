import React, { useState } from 'react';
import { ChatChannel } from '../../types';
import { sound } from '../../utils/audioSynth';
import { Hash, X, Plus } from 'lucide-react';

interface ChannelManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (channel: { name: string; category: ChatChannel['category']; topic: string }) => void;
}

export const ChannelManageModal: React.FC<ChannelManageModalProps> = ({
  isOpen,
  onClose,
  onCreateChannel,
}) => {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<ChatChannel['category']>('TEXT CHANNELS');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!cleanName) return;

    onCreateChannel({
      name: cleanName,
      category,
      topic: topic.trim(),
    });

    sound.playWin();
    setName('');
    setTopic('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-indigo-400" />
            <span>Create Channel</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-500 font-bold">#</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="new-channel"
                required
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="TEXT CHANNELS">TEXT CHANNELS</option>
              <option value="BOT COMMANDS">BOT COMMANDS</option>
              <option value="GAMES & EXPEDITIONS">GAMES & EXPEDITIONS</option>
              <option value="CREATURE BATTLES">CREATURE BATTLES</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Channel Topic (Optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer"
            >
              Create Channel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
