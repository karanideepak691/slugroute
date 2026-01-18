'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Bike } from 'lucide-react';

interface LoginOverlayProps {
    onLogin: (name: string, mode: 'hiker' | 'biker') => void;
}

export default function LoginOverlay({ onLogin }: LoginOverlayProps) {
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'hiker' | 'biker'>('biker');

    return (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-gray-900 border border-white/10 p-8 rounded-2xl max-w-md w-full shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 text-transparent bg-clip-text">
                        SlugRoute+
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">Sign in to find routes & buddies.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sammy Slug"
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Preferred Mode</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setMode('biker')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${mode === 'biker' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                                    }`}
                            >
                                <Bike className="w-6 h-6" />
                                <span className="text-sm font-bold">Biker</span>
                            </button>
                            <button
                                onClick={() => setMode('hiker')}
                                className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${mode === 'hiker' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-transparent text-gray-500 hover:bg-white/10'
                                    }`}
                            >
                                <Footprints className="w-6 h-6" />
                                <span className="text-sm font-bold">Hiker</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (name.trim()) onLogin(name, mode);
                        }}
                        disabled={!name.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                        Join Network
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
