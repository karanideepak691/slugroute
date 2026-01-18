'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    text: string;
}

interface ChatWidgetProps {
    onNavigate: (tab: 'navigation' | 'community' | 'friends' | 'weather') => void;
    context: {
        temp: number;
        condition: string;
        activeTab: string;
    };
}

export default function ChatWidget({ onNavigate, context }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', text: "Hi! I'm your Gemini Guide. Ask me to navigate or summarize the app!" }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    context: context
                })
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                // If response is not JSON (e.g. standard 500 page), use default
                data = { text: "Sorry, I couldn't connect." };
            }

            if (!response.ok && !data.text) {
                throw new Error("Failed to fetch");
            }

            const fullText = data.text || "Sorry, I couldn't connect.";

            // Parse Action Tags
            let cleanText = fullText;
            let action: 'weather' | 'friends' | 'community' | 'navigation' | null = null;

            if (fullText.includes('[ACTION: NAVIGATE_WEATHER]')) {
                action = 'weather';
                cleanText = fullText.replace('[ACTION: NAVIGATE_WEATHER]', '');
            } else if (fullText.includes('[ACTION: NAVIGATE_FRIENDS]')) {
                action = 'friends';
                cleanText = fullText.replace('[ACTION: NAVIGATE_FRIENDS]', '');
            } else if (fullText.includes('[ACTION: NAVIGATE_COMMUNITY]')) {
                action = 'community';
                cleanText = fullText.replace('[ACTION: NAVIGATE_COMMUNITY]', '');
            } else if (fullText.includes('[ACTION: NAVIGATE_MAP]')) {
                action = 'navigation';
                cleanText = fullText.replace('[ACTION: NAVIGATE_MAP]', '');
            }

            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: cleanText.trim() }]);

            if (action) {
                onNavigate(action);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', text: "I'm having trouble connecting to the network right now." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-[999] bg-gradient-to-r from-blue-600 to-teal-500 p-4 rounded-full shadow-2xl hover:scale-110 transition-transform group"
                >
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
                </motion.button>
            )}

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.9 }}
                        className="fixed bottom-24 right-6 w-80 h-96 z-[999] bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-4 bg-gradient-to-r from-blue-600/20 to-teal-500/20 border-b border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-white">Gemini Guide</h3>
                                    <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-gray-400">Online</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${msg.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white/10 text-gray-200 rounded-bl-none'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white/10 p-3 rounded-xl rounded-bl-none flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100" />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t border-white/10 bg-black/40">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-2"
                            >
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask Gemini..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
