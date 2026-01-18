'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Gauge, AudioWaveform, Info, Clock, Play, Navigation } from 'lucide-react';
import clsx from 'clsx';

interface RouteCardProps {
    id: string;
    name: string;
    time: number;
    distance: number;
    effort: number;
    windExposure: string;
    selected: boolean;
    onSelect: () => void;
    onExplain: () => void;
    onAudio: () => void;
    color: string;
}

export default function RouteCard({
    id, name, time, distance, effort, windExposure,
    selected, onSelect, onExplain, onAudio, onStart, color
}: RouteCardProps & { onStart: () => void }) {

    return (
        <motion.div
            layout
            onClick={onSelect}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, borderColor: selected ? color : 'transparent' }}
            className={clsx(
                "cursor-pointer rounded-2xl p-4 transition-all duration-300 relative overflow-hidden group",
                selected
                    ? "bg-[#B2C9AB] backdrop-blur-md shadow-lg ring-2 ring-[#4A4036]/10"
                    : "bg-[#B2C9AB]/60 hover:bg-[#B2C9AB] shadow-sm"
            )}
        >
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <span className="text-3xl font-bold text-[#4A4036] tracking-tight">{time} <span className="text-base font-normal text-[#4A4036]/60">min</span></span>
                    <div className="flex items-center gap-2 text-sm text-[#4A4036]/70 font-medium">
                        <span className={clsx("w-2 h-2 rounded-full", color === '#4ade80' ? 'bg-green-600' : color === '#facc15' ? 'bg-yellow-600' : 'bg-blue-600')} />
                        {name}
                        <span className="text-xs opacity-50">•</span>
                        {distance} mi
                    </div>
                </div>

                {/* Wind Indicator (Subtle) */}
                <div className="flex flex-col items-end opacity-60 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 text-xs text-[#4A4036]">
                        <Wind className="w-3 h-3" /> {windExposure}
                    </div>
                    <div className="text-[10px] text-[#4A4036]/70">Effort {effort}/10</div>
                </div>
            </div>

            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); onStart(); }}
                                className="flex-1 bg-[#4A4036] hover:bg-[#3E352D] text-[#EAE0D5] font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Navigation className="w-5 h-5 text-[#EAE0D5]" /> GO
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onExplain(); }}
                                className="w-12 bg-[#EAE0D5]/20 hover:bg-[#EAE0D5]/30 text-[#4A4036] rounded-xl flex items-center justify-center transition-colors border border-[#4A4036]/10"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
