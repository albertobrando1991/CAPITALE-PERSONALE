// ============================================================================
// ORAL EXAM PAGE - Premium Feature
// File: client/src/pages/OralExamPage.tsx
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowLeft,
    Mic,
    MicOff,
    Send,
    Loader2,
    GraduationCap,
    User,
    BookOpen,
    Award,
    Volume2,
    VolumeX,
    RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Concorso } from '@shared/schema';

// ============================================================================
// TYPES
// ============================================================================

interface OralExamMessage {
    role: 'user' | 'instructor';
    content: string;
    timestamp: string;
}

interface OralExamFeedback {
    score: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    overallComment: string;
}

interface OralExamSession {
    id: string;
    persona: string;
    topics: string[];
    messages: OralExamMessage[];
    currentTurn: number;
    maxTurns: number;
    status: 'active' | 'completed' | 'abandoned';
    feedback?: OralExamFeedback;
    score?: number;
}

type ExamPhase = 'setup' | 'session' | 'feedback';

// ============================================================================
// PERSONA IMAGES (Reactive Avatars)
// ============================================================================

const PERSONA_IMAGES = {
    rigorous: {
        listening: '/images/professor-male-listening.jpg',
        thinking: '/images/professor-male-thinking.jpg',
        speaking: '/images/professor-male-speaking.jpg',
        positive: '/images/professor-male-positive.jpg',
    },
    empathetic: {
        listening: '/images/professor-female-listening.jpg',
        thinking: '/images/professor-female-thinking.jpg',
        speaking: '/images/professor-female-speaking.jpg',
        positive: '/images/professor-female-positive.jpg',
    },
};

type PersonaState = 'listening' | 'thinking' | 'speaking' | 'positive';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OralExamPage() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [match, params] = useRoute('/concorsi/:concorsoId/oral-exam');
    const concorsoId = match ? params.concorsoId : null;

    // Phase state
    const [phase, setPhase] = useState<ExamPhase>('setup');
    const [session, setSession] = useState<OralExamSession | null>(null);

    // Setup state
    const [selectedPersona, setSelectedPersona] = useState<'rigorous' | 'empathetic'>('rigorous');
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [maxTurns, setMaxTurns] = useState(5);

    // Session state
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [personaState, setPersonaState] = useState<PersonaState>('listening');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch concorso data
    const { data: concorso, isLoading: loadingConcorso } = useQuery<Concorso>({
        queryKey: ['/api/concorsi', concorsoId],
        queryFn: async () => {
            const res = await fetch(`/api/concorsi/${concorsoId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch concorso');
            return res.json();
        },
        enabled: !!concorsoId,
    });

    // Extract materie from bando
    const bandoData = concorso?.bandoAnalysis as { materie?: { nome: string }[] } | null;
    const availableTopics = bandoData?.materie?.map((m) => m.nome) || [];

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [session?.messages]);

    // ============================================================================
    // START SESSION
    // ============================================================================

    const startSession = async () => {
        if (selectedTopics.length === 0) {
            toast({ title: 'Seleziona almeno un argomento', variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setPersonaState('thinking');

        try {
            const res = await fetch('/api/oral-exam/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    concorsoId,
                    persona: selectedPersona,
                    topics: selectedTopics,
                    difficulty,
                    maxTurns,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Errore avvio sessione');
            }

            const data = await res.json();

            setSession({
                id: data.sessionId,
                persona: selectedPersona,
                topics: selectedTopics,
                messages: [{ role: 'instructor', content: data.firstMessage, timestamp: new Date().toISOString() }],
                currentTurn: data.currentTurn,
                maxTurns: data.maxTurns,
                status: 'active',
            });

            setPhase('session');
            setPersonaState('speaking');

            // Auto-speak first message
            speakText(data.firstMessage);
        } catch (error: any) {
            toast({ title: 'Errore', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================================
    // SEND MESSAGE
    // ============================================================================

    const sendMessage = async () => {
        if (!userInput.trim() || !session || isLoading) return;

        const userMessage = userInput.trim();
        setUserInput('');
        setIsLoading(true);
        setPersonaState('thinking');

        // Add user message to UI immediately
        setSession((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                messages: [...prev.messages, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }],
            };
        });

        try {
            const res = await fetch(`/api/oral-exam/${session.id}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: userMessage }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Errore invio risposta');
            }

            const data = await res.json();

            // Add AI response
            setSession((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: [...prev.messages, { role: 'instructor', content: data.message, timestamp: new Date().toISOString() }],
                    currentTurn: data.currentTurn,
                    status: data.isCompleted ? 'completed' : 'active',
                };
            });

            setPersonaState('speaking');
            speakText(data.message);

            // If completed, get feedback
            if (data.isCompleted) {
                await getSessionFeedback();
            }
        } catch (error: any) {
            toast({ title: 'Errore', description: error.message, variant: 'destructive' });
            setPersonaState('listening');
        } finally {
            setIsLoading(false);
        }
    };

    // ============================================================================
    // GET FEEDBACK
    // ============================================================================

    const getSessionFeedback = async () => {
        if (!session) return;

        try {
            const res = await fetch(`/api/oral-exam/${session.id}/end`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Errore recupero feedback');

            const data = await res.json();

            setSession((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    feedback: data.feedback,
                    score: data.score,
                    status: 'completed',
                };
            });

            setPhase('feedback');
            setPersonaState('positive');
        } catch (error: any) {
            console.error('Feedback error:', error);
        }
    };

    // ============================================================================
    // SPEECH SYNTHESIS (TTS)
    // ============================================================================

    const speakText = (text: string) => {
        if (!('speechSynthesis' in window)) return;

        // Stop any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'it-IT';
        utterance.rate = 0.95;
        utterance.pitch = selectedPersona === 'rigorous' ? 0.9 : 1.1;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            setPersonaState('listening');
        };
        utterance.onerror = () => {
            setIsSpeaking(false);
            setPersonaState('listening');
        };

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        setPersonaState('listening');
    };

    // ============================================================================
    // SPEECH RECOGNITION (STT)
    // ============================================================================

    const toggleListening = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            toast({ title: 'Riconoscimento vocale non supportato', variant: 'destructive' });
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.lang = 'it-IT';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setUserInput((prev) => prev + ' ' + transcript);
        };

        recognition.start();
    };

    // ============================================================================
    // RENDER: LOADING
    // ============================================================================

    if (!concorsoId || loadingConcorso) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // ============================================================================
    // RENDER: SETUP PHASE
    // ============================================================================

    if (phase === 'setup') {
        return (
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href={`/concorsi/${concorsoId}`}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <GraduationCap className="h-6 w-6" />
                            Simulazione Esame Orale
                        </h1>
                        <p className="text-muted-foreground">{concorso?.nome}</p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                        Premium
                    </Badge>
                </div>

                {/* Persona Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Scegli il tuo Docente</CardTitle>
                        <CardDescription>Ogni docente ha un approccio diverso alla valutazione</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card
                                className={`cursor-pointer transition-all ${selectedPersona === 'rigorous' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                                onClick={() => setSelectedPersona('rigorous')}
                            >
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                                        <User className="h-8 w-8 text-slate-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Prof. Bianchi</h3>
                                        <p className="text-sm text-muted-foreground">Rigoroso ed esigente</p>
                                        <Badge variant="outline" className="mt-1">
                                            Difficoltà +
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card
                                className={`cursor-pointer transition-all ${selectedPersona === 'empathetic' ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                                onClick={() => setSelectedPersona('empathetic')}
                            >
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                                        <User className="h-8 w-8 text-pink-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Prof.ssa Verdi</h3>
                                        <p className="text-sm text-muted-foreground">Incoraggiante e supportiva</p>
                                        <Badge variant="outline" className="mt-1">
                                            Guidata
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>

                {/* Topics Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Argomenti dell'Esame</CardTitle>
                        <CardDescription>Seleziona le materie su cui vuoi essere interrogato</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {availableTopics.length > 0 ? (
                                availableTopics.map((topic) => (
                                    <Badge
                                        key={topic}
                                        variant={selectedTopics.includes(topic) ? 'default' : 'outline'}
                                        className="cursor-pointer text-sm py-1.5 px-3"
                                        onClick={() => {
                                            setSelectedTopics((prev) =>
                                                prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
                                            );
                                        }}
                                    >
                                        {topic}
                                    </Badge>
                                ))
                            ) : (
                                <p className="text-muted-foreground">Nessuna materia disponibile. Completa prima la Fase 0.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Impostazioni</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span>Difficoltà</span>
                            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as any)}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Facile</SelectItem>
                                    <SelectItem value="medium">Media</SelectItem>
                                    <SelectItem value="hard">Difficile</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Numero Domande</span>
                            <Select value={String(maxTurns)} onValueChange={(v) => setMaxTurns(Number(v))}>
                                <SelectTrigger className="w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="3">3 domande</SelectItem>
                                    <SelectItem value="5">5 domande</SelectItem>
                                    <SelectItem value="7">7 domande</SelectItem>
                                    <SelectItem value="10">10 domande</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Start Button */}
                <Button
                    size="lg"
                    className="w-full"
                    onClick={startSession}
                    disabled={isLoading || selectedTopics.length === 0}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GraduationCap className="h-4 w-4 mr-2" />}
                    Inizia Esame Orale
                </Button>
            </div>
        );
    }

    // ============================================================================
    // RENDER: SESSION PHASE
    // ============================================================================

    if (phase === 'session' && session) {
        return (
            <div className="flex flex-col h-[calc(100vh-80px)]">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold">
                                {selectedPersona === 'rigorous' ? 'Prof. Bianchi' : 'Prof.ssa Verdi'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Domanda {session.currentTurn} di {session.maxTurns}
                            </p>
                        </div>
                    </div>
                    <Progress value={(session.currentTurn / session.maxTurns) * 100} className="w-32" />
                </div>

                {/* Avatar Area */}
                <div className="p-4 bg-gradient-to-b from-slate-100 to-white dark:from-slate-900 dark:to-background flex justify-center">
                    <div className="relative">
                        <div
                            className={`w-32 h-32 rounded-full bg-slate-200 flex items-center justify-center transition-all duration-300 ${personaState === 'speaking' ? 'ring-4 ring-primary ring-opacity-50 animate-pulse' : ''
                                } ${personaState === 'thinking' ? 'opacity-70' : ''}`}
                        >
                            <User className="h-16 w-16 text-slate-500" />
                        </div>
                        {isSpeaking && (
                            <Button
                                size="icon"
                                variant="secondary"
                                className="absolute -bottom-2 -right-2"
                                onClick={stopSpeaking}
                            >
                                <VolumeX className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Chat Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 max-w-2xl mx-auto">
                        {session.messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted p-3 rounded-lg">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t">
                    <div className="max-w-2xl mx-auto flex gap-2">
                        <Button
                            variant={isListening ? 'destructive' : 'outline'}
                            size="icon"
                            onClick={toggleListening}
                            disabled={isLoading}
                        >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                        <Textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Scrivi la tua risposta..."
                            className="min-h-[60px] resize-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    sendMessage();
                                }
                            }}
                            disabled={isLoading || session.status === 'completed'}
                        />
                        <Button
                            size="icon"
                            onClick={sendMessage}
                            disabled={isLoading || !userInput.trim() || session.status === 'completed'}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================================
    // RENDER: FEEDBACK PHASE
    // ============================================================================

    if (phase === 'feedback' && session?.feedback) {
        const scoreColor =
            session.feedback.score >= 27
                ? 'text-green-600'
                : session.feedback.score >= 24
                    ? 'text-blue-600'
                    : session.feedback.score >= 18
                        ? 'text-yellow-600'
                        : 'text-red-600';

        return (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
                {/* Score Card */}
                <Card className="text-center">
                    <CardContent className="py-8">
                        <Award className={`h-16 w-16 mx-auto mb-4 ${scoreColor}`} />
                        <h1 className={`text-5xl font-bold ${scoreColor}`}>{session.feedback.score}/30</h1>
                        <p className="text-muted-foreground mt-2">Esame Completato</p>
                    </CardContent>
                </Card>

                {/* Overall Comment */}
                <Card>
                    <CardHeader>
                        <CardTitle>Valutazione Generale</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg">{session.feedback.overallComment}</p>
                    </CardContent>
                </Card>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-green-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-green-600 flex items-center gap-2">
                                <BookOpen className="h-5 w-5" />
                                Punti di Forza
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-1">
                                {session.feedback.strengths.map((s, i) => (
                                    <li key={i} className="text-sm">{s}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="border-orange-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-orange-600 flex items-center gap-2">
                                <RefreshCw className="h-5 w-5" />
                                Aree di Miglioramento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="list-disc list-inside space-y-1">
                                {session.feedback.weaknesses.map((w, i) => (
                                    <li key={i} className="text-sm">{w}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Suggestions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Suggerimenti per lo Studio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="list-disc list-inside space-y-2">
                            {session.feedback.suggestions.map((s, i) => (
                                <li key={i}>{s}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button variant="outline" className="flex-1" onClick={() => setPhase('setup')}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Riprova
                    </Button>
                    <Link href={`/concorsi/${concorsoId}`} className="flex-1">
                        <Button className="w-full">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Torna al Concorso
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Fallback
    return null;
}
