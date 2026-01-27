
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Bot, Minimize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { ContactSupport } from './ContactSupport';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/queryClient';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    supportOptions?: any;
}

export function ChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Only show if user is logged in
    if (!user) return null;

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        const userText = input.trim();
        if (!userText || isLoading) return;

        setInput('');
        setError(null);

        // Add user message immediately
        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userText,
        };
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            const res = await apiFetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
                    sessionId,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Errore ${res.status}`);
            }

            const data = await res.json();

            // Store session ID for subsequent messages
            if (data.sessionId) {
                setSessionId(data.sessionId);
            }

            // Add assistant message
            const assistantMsg: ChatMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.reply,
                supportOptions: data.supportRequested ? data.supportOptions : undefined,
            };
            setMessages(prev => [...prev, assistantMsg]);

        } catch (err: any) {
            console.error('[Chat] Error:', err);
            setError(err.message || 'Si è verificato un errore.');
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, messages, sessionId]);

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 z-50 transition-all duration-300 hover:scale-110"
            >
                <MessageCircle className="h-8 w-8 text-white" />
            </Button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">

            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <h3 className="font-semibold text-lg">Assistente CP</h3>
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 hover:bg-blue-700 text-white rounded-full">
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-500 mt-10 space-y-2">
                        <Bot className="h-12 w-12 mx-auto text-blue-200" />
                        <p className="text-sm">Ciao {user.firstName}! 👋</p>
                        <p className="text-xs">Sono qui per aiutarti a usare la piattaforma.<br />Chiedimi pure come funzionano i Quiz, le Flashcard o l'esame Orale.</p>
                    </div>
                )}

                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={cn(
                            "flex w-full mb-4",
                            m.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                            className={cn(
                                "max-w-[85%] rounded-2xl p-3 text-sm shadow-sm",
                                m.role === 'user'
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-none"
                            )}
                        >
                            {/* Text Content */}
                            {m.content && (
                                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                            )}

                            {/* Support Contact Options */}
                            {m.supportOptions && (
                                <div className="mt-2">
                                    <ContactSupport options={m.supportOptions} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start w-full">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-2">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                        <X className="h-4 w-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Chiedi aiuto..."
                    className="flex-1 focus-visible:ring-blue-600"
                    disabled={isLoading}
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
