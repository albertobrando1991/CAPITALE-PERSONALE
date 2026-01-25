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
    Upload,
    FileText,
    Mic2,
    Settings,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { Concorso } from '@shared/schema';

// ============================================================================
// TYPES
// ============================================================================

type ExamPhase = 'setup' | 'session' | 'feedback';
type PersonaState = 'listening' | 'thinking' | 'speaking' | 'positive' | 'negative';

interface OralExamSession {
    id: string;
    persona: 'rigorous' | 'empathetic';
    topics: string[];
    messages: { role: 'user' | 'instructor'; content: string; timestamp?: string }[];
    currentTurn: number;
    maxTurns: number;
    feedback?: {
        score: number;
        overallComment: string;
        strengths: string[];
        weaknesses: string[];
    };
    score?: number;
    status: 'active' | 'completed';
}

const PERSONA_IMAGES = {
    rigorous: {
        listening: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
        thinking: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400', // Placeholder
        speaking: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400', // Placeholder
        positive: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
        negative: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
    },
    empathetic: {
        listening: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        thinking: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        speaking: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        positive: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        negative: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    },
};

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
    const [sourceType, setSourceType] = useState<'topics' | 'pdf'>('topics');
    const [uploadingPdf, setUploadingPdf] = useState(false);
    const [pdfContext, setPdfContext] = useState<string>('');
    const [pdfFileName, setPdfFileName] = useState<string>('');

    // Session state
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [personaState, setPersonaState] = useState<PersonaState>('listening');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [fluidMode, setFluidMode] = useState(true); // Default to fluid mode
    const [voiceSpeed, setVoiceSpeed] = useState(1.0); // Default speed
    const [countdown, setCountdown] = useState<number | null>(null); // For fluid mode countdown

    // NEW: Intelligent speech recognition with Whisper
    const [isRecording, setIsRecording] = useState(false);
    const [transcriptionInProgress, setTranscriptionInProgress] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioLevelCheckInterval = useRef<NodeJS.Timeout | null>(null);

    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

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

    // Cleanup countdown on unmount
    useEffect(() => {
        return () => {
            if (countdownRef.current) clearTimeout(countdownRef.current);
        };
    }, []);

    // Countdown effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (countdown !== null && countdown > 0) {
            interval = setInterval(() => {
                setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
            }, 1000);
        } else if (countdown === 0) {
            // Timer finished, send message
            setCountdown(null);
            document.getElementById('send-button')?.click();
        }
        return () => clearInterval(interval);
    }, [countdown]);

    // ============================================================================
    // START SESSION
    // ============================================================================

    const startSession = async () => {
        if (sourceType === 'topics' && selectedTopics.length === 0) {
            toast({ title: 'Seleziona almeno un argomento', variant: 'destructive' });
            return;
        }

        if (sourceType === 'pdf' && !pdfContext) {
            toast({ title: 'Carica un PDF prima di iniziare', variant: 'destructive' });
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
                    topics: sourceType === 'topics' ? selectedTopics : [pdfFileName || 'Materiale Caricato'],
                    difficulty,
                    maxTurns,
                    context: pdfContext || undefined,
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

        // Cancel any pending countdown
        if (countdownRef.current) clearTimeout(countdownRef.current);
        setCountdown(null);
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }

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

    const speakText = async (text: string) => {
        if (!text) return;

        // Stop any current audio
        window.speechSynthesis.cancel();

        // Mobile audio context unlock (best effort)
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            ctx.resume().catch(() => { });
        }

        try {
            setPersonaState('speaking');
            console.log("Creating TTS request for:", text.substring(0, 50) + "...");

            // Call backend TTS with speed param
            const response = await fetch('/api/oral-exam/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text,
                    persona: selectedPersona,
                    speed: voiceSpeed // Pass user selected speed
                })
            });

            if (!response.ok) {
                const errDetail = await response.text();
                // console.error('TTS Backend Error:', response.status, errDetail);
                throw new Error(`TTS Failed: ${response.status} ${errDetail}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            // console.log("Audio blob created, size:", blob.size);

            audio.onended = () => {
                setPersonaState('listening');
                URL.revokeObjectURL(url);

                // FLUID MODE: Auto-restart recognition if enabled
                // Only if session is still active
                if (fluidMode && phase === 'session') {
                    // Small delay to ensure state is clean
                    setTimeout(() => {
                        // Double check we are still in session
                        // (Use ref or check DOM element presence to be safe, but toggleListening checks internally too)
                        toggleListening();
                    }, 500);
                }
            };

            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                setPersonaState('listening');
                throw new Error("Audio Object Error");
            };

            await audio.play();
            // console.log("Audio playback started successfully");

        } catch (error) {
            console.error('OpenAI TTS failed, falling back to WebSpeech. Reason:', error);

            // Fallback to Web Speech API
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'it-IT';
            utterance.rate = voiceSpeed; // Use rate for WebSpeech too
            utterance.onend = () => {
                setPersonaState('listening');
                if (fluidMode && phase === 'session') {
                    setTimeout(() => toggleListening(), 500);
                }
            };
            window.speechSynthesis.speak(utterance);
        }
    };

    // ============================================================================
    // INTELLIGENT SPEECH RECOGNITION SYSTEM (Whisper API)
    // ============================================================================

    const toggleListening = async () => {
        // Stop recording if already recording
        if (isRecording) {
            console.log('[REC] Stopping recording...');
            stopRecording();
            return;
        }

        // Cancel any countdown
        if (countdown !== null) {
            setCountdown(null);
            if (countdownRef.current) clearTimeout(countdownRef.current);
        }

        // Start recording
        try {
            console.log('[REC] Starting recording...');

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            // Setup MediaRecorder for high-quality recording
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                audioBitsPerSecond: 128000, // 128kbps for good quality
            });

            const chunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[REC] Recording stopped, processing...');

                // Combine all chunks into a blob
                const audioBlob = new Blob(chunks, { type: mimeType });
                console.log(`[REC] Audio blob created: ${audioBlob.size} bytes`);

                // Transcribe with Whisper
                await transcribeAudio(audioBlob);

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
                stopSilenceDetection();
            };

            mediaRecorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setIsListening(true);
            setPersonaState('listening');

            // Setup real-time silence detection
            setupSilenceDetection(stream);

            console.log('[REC] Recording started successfully');

        } catch (error) {
            console.error('[REC] Failed to start recording:', error);
            toast({
                title: 'Errore Microfono',
                description: 'Impossibile accedere al microfono. Verifica i permessi.',
                variant: 'destructive',
            });
        }
    };

    // ============================================================================
    // SILENCE DETECTION (Smart Pause Detection)
    // ============================================================================

    const setupSilenceDetection = (stream: MediaStream) => {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        source.connect(analyser);
        analyser.fftSize = 2048;

        audioContextRef.current = audioContext;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let silenceStart: number | null = null;
        let lastSoundTime = Date.now();
        const SILENCE_THRESHOLD = 30; // Volume threshold
        const MIN_SPEECH_DURATION = 2000; // Minimum 2 seconds of speech
        const SILENCE_DURATION = 2500; // 2.5 seconds of silence for end of speech

        const checkAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;

            // Detect if speaking
            if (average > SILENCE_THRESHOLD) {
                lastSoundTime = Date.now();
                silenceStart = null;
                setInterimTranscript('🎤 Ti ascolto...'); // Visual feedback
            } else {
                // Silence detected
                if (silenceStart === null) {
                    silenceStart = Date.now();
                }

                const silenceDuration = Date.now() - silenceStart;
                const speechDuration = lastSoundTime - (Date.now() - silenceDuration);

                // Smart logic: only if spoke enough AND silence is prolonged
                if (speechDuration > MIN_SPEECH_DURATION && silenceDuration > SILENCE_DURATION) {
                    console.log(`[REC] Natural pause detected after ${speechDuration}ms of speech`);
                    stopRecording();
                }
            }
        };

        // Check audio level every 100ms
        audioLevelCheckInterval.current = setInterval(checkAudioLevel, 100);
    };

    const stopSilenceDetection = () => {
        if (audioLevelCheckInterval.current) {
            clearInterval(audioLevelCheckInterval.current);
            audioLevelCheckInterval.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setIsListening(false);
        setInterimTranscript('');
        stopSilenceDetection();
    };

    // ============================================================================
    // TRANSCRIPTION WITH WHISPER (High Accuracy)
    // ============================================================================

    const transcribeAudio = async (audioBlob: Blob) => {
        setTranscriptionInProgress(true);
        setPersonaState('thinking');

        try {
            console.log('[STT] Sending audio to Whisper API...');

            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/oral-exam/transcribe', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Transcription failed: ${response.status}`);
            }

            const result = await response.json();
            const transcribedText = result.text.trim();

            console.log(`[STT] Transcription: "${transcribedText}"`);

            if (transcribedText) {
                setUserInput((prev) => prev ? `${prev} ${transcribedText}` : transcribedText);

                toast({
                    title: 'Trascrizione completata',
                    description: transcribedText.substring(0, 100) + (transcribedText.length > 100 ? '...' : ''),
                    duration: 3000,
                });

                // In fluid mode, auto-send after visual confirmation
                if (fluidMode && transcribedText.length > 20) {
                    // Start countdown for auto-send
                    setCountdown(3); // 3 seconds to cancel
                }
            } else {
                toast({
                    title: 'Nessun audio rilevato',
                    description: 'Riprova parlando più vicino al microfono',
                    variant: 'destructive',
                });
            }

        } catch (error: any) {
            console.error('[STT] Transcription error:', error);
            toast({
                title: 'Errore trascrizione',
                description: error.message || 'Riprova',
                variant: 'destructive',
            });
        } finally {
            setTranscriptionInProgress(false);
            setPersonaState('listening');
        }
    };

    const handleResumeSpeaking = () => {
        // If countdown is active and user clicks "Speak Again"
        setCountdown(null);
        if (countdownRef.current) clearTimeout(countdownRef.current);
        toggleListening();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ title: 'Solo file PDF sono supportati', variant: 'destructive' });
            return;
        }

        setUploadingPdf(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/oral-exam/upload-pdf', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Upload fallito');

            const data = await res.json();
            setPdfContext(data.text);
            setPdfFileName(file.name);
            toast({ title: 'PDF analizzato con successo', description: `${data.pages} pagine elaborate.` });
        } catch (error) {
            console.error(error);
            toast({ title: 'Errore caricamento PDF', variant: 'destructive' });
        } finally {
            setUploadingPdf(false);
        }
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

                {/* Content Source Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Argomenti dell'Esame</CardTitle>
                        <CardDescription>Scegli la fonte delle domande</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Tabs defaultValue="topics" value={sourceType} onValueChange={(v) => setSourceType(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="topics">Materie Concorso</TabsTrigger>
                                <TabsTrigger value="pdf">Carica Materiale (PDF)</TabsTrigger>
                            </TabsList>

                            <TabsContent value="topics" className="mt-4">
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
                            </TabsContent>

                            <TabsContent value="pdf" className="mt-4 space-y-4">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
                                    <input
                                        type="file"
                                        id="pdf-upload"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploadingPdf}
                                    />
                                    <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                        {uploadingPdf ? (
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        ) : pdfContext ? (
                                            <>
                                                <FileText className="h-10 w-10 text-green-600" />
                                                <span className="font-semibold text-green-700">{pdfFileName}</span>
                                                <span className="text-sm text-muted-foreground">Clicca per cambiare file</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="h-10 w-10 text-slate-400" />
                                                <span className="font-semibold">Clicca per caricare un PDF</span>
                                                <span className="text-sm text-muted-foreground">Estrarremo le domande dal contenuto</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle>Impostazioni</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
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

                        {/* Voice Speed Slider */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Velocità Voce
                                </span>
                                <span className="text-sm text-muted-foreground">{voiceSpeed.toFixed(2)}x</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-muted-foreground">Lenta</span>
                                <input
                                    type="range"
                                    min="0.75"
                                    max="1.25"
                                    step="0.05"
                                    value={voiceSpeed}
                                    className="w-full accent-primary h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                                    onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                />
                                <span className="text-xs text-muted-foreground">Veloce</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="flex items-center gap-2">
                                <Mic2 className="h-4 w-4" />
                                Modalità Fluida
                            </span>
                            <div className="flex items-center gap-2">
                                <Switch checked={fluidMode} onCheckedChange={setFluidMode} />
                                <span className="text-sm text-muted-foreground">
                                    {fluidMode ? 'Attiva (Auto-Invio)' : 'Manuale'}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Start Button */}
                <Button
                    size="lg"
                    className="w-full"
                    onClick={startSession}
                    disabled={isLoading || (sourceType === 'topics' ? selectedTopics.length === 0 : !pdfContext)}
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GraduationCap className="h-4 w-4 mr-2" />}
                    Inizia Esame Orale
                </Button>
            </div>
        );
    }

    // ============================================================================
    // RENDER: SESSION PHASE (FULL IMMERSIVE UI)
    // ============================================================================

    if (phase === 'session' && session) {
        return (
            <div className="relative h-[calc(100dvh-80px)] w-full overflow-hidden bg-black">
                {/* Background Image - Immersive Room */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-100 dark:brightness-75"
                    style={{
                        backgroundImage: "url('/images/exam-room-hq.jpg')",
                        transform: personaState === 'speaking' ? 'scale(1.02)' : 'scale(1)'
                    }}
                />

                {/* Overlay Gradient for Text Readability if needed */}
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between bg-black/40 backdrop-blur-sm text-white border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                            <GraduationCap className="h-5 w-5 text-primary-foreground" />
                            <span className="font-semibold text-sm">
                                {selectedPersona === 'rigorous' ? 'Prof. Bianchi' : 'Prof.ssa Verdi'}
                            </span>
                        </div>
                        <Badge variant="outline" className="text-white border-white/20 bg-black/20">
                            Domanda {session.currentTurn}/{session.maxTurns}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                        <Progress value={(session.currentTurn / session.maxTurns) * 100} className="w-32 h-2 bg-white/20" />
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => window.location.reload()} // Quick exit
                            className="h-8 opacity-80 hover:opacity-100"
                        >
                            Esci
                        </Button>
                    </div>
                </div>

                {/* Main Content Area - Professor on left, Message on right */}
                <div className="absolute inset-0 z-10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 pt-20 pb-44 md:pb-32 px-4">
                    {/* Professor Avatar - Left side on desktop, center on mobile */}
                    <div className="relative w-[250px] h-[250px] md:w-[350px] md:h-[350px] lg:w-[400px] lg:h-[400px] flex-shrink-0 transition-all duration-500">
                        <div
                            className={`w-full h-full rounded-full overflow-hidden border-4 border-white/20 bg-slate-900/50 shadow-2xl backdrop-blur-sm
                            transition-all duration-300 ${personaState === 'speaking' ? 'ring-4 ring-primary/50 scale-105' : 'scale-100'}
                            ${personaState === 'thinking' ? 'animate-pulse opacity-80' : ''}`}
                        >
                            <img
                                src={PERSONA_IMAGES[selectedPersona][personaState]}
                                alt="Professor"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {/* Professor name badge */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20">
                            <span className="text-white text-sm font-medium">
                                {selectedPersona === 'rigorous' ? 'Prof. Bianchi' : 'Prof.ssa Verdi'}
                            </span>
                        </div>
                    </div>

                    {/* Message Panel - Right side on desktop, below on mobile */}
                    {session.messages.length > 0 && session.messages[session.messages.length - 1].role === 'instructor' && (
                        <div className="w-full md:w-[400px] lg:w-[500px] max-h-[200px] md:max-h-[350px] overflow-y-auto">
                            <div className="bg-white/10 backdrop-blur-md p-5 md:p-6 rounded-2xl border border-white/20 text-white shadow-2xl animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
                                    <Volume2 className="h-4 w-4" />
                                    <span>Il professore dice:</span>
                                </div>
                                <p className="text-base md:text-lg font-medium leading-relaxed italic">
                                    "{session.messages[session.messages.length - 1].content}"
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat/Interaction Area - Bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-30 p-4 pb-8 md:p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <div className="max-w-3xl mx-auto space-y-4">

                        {/* User Output / Preview - Enhanced */}
                        {(userInput || interimTranscript || transcriptionInProgress) && (
                            <div className="bg-primary/20 backdrop-blur-sm border border-primary/30 p-3 rounded-lg text-white mb-2 animate-in fade-in slide-in-from-bottom-2">
                                {transcriptionInProgress ? (
                                    <>
                                        <p className="text-sm font-medium opacity-80 mb-1 flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Trascrizione in corso...
                                        </p>
                                        <p className="text-lg opacity-60">Elaborando audio con Whisper AI...</p>
                                    </>
                                ) : interimTranscript ? (
                                    <>
                                        <p className="text-sm font-medium opacity-80 mb-1">🎤 Registrazione attiva:</p>
                                        <p className="text-lg italic">{interimTranscript}</p>
                                    </>
                                ) : userInput ? (
                                    <>
                                        <p className="text-sm font-medium opacity-80 mb-1">La tua risposta:</p>
                                        <p className="text-lg">{userInput}</p>
                                    </>
                                ) : null}
                            </div>
                        )}

                        <div className="flex gap-2 items-center">
                            <Button
                                variant={isRecording ? "destructive" : "secondary"}
                                size="lg"
                                className={`h-14 w-14 rounded-full shadow-xl transition-all ${
                                    isRecording ? 'animate-pulse ring-4 ring-red-500/30' : ''
                                } ${transcriptionInProgress ? 'opacity-50' : ''}`}
                                onClick={toggleListening}
                                disabled={isLoading || transcriptionInProgress || session.status === 'completed'}
                            >
                                {transcriptionInProgress ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : isRecording ? (
                                    <MicOff className="h-6 w-6" />
                                ) : (
                                    <Mic className="h-6 w-6" />
                                )}
                            </Button>

                            <div className="flex-1 relative">
                                <Textarea
                                    id="speech-input"
                                    value={userInput}
                                    onChange={(e) => setUserInput(e.target.value)}
                                    placeholder={isListening ? "Ti ascolto..." : "Scrivi la tua risposta qui..."}
                                    className="min-h-[56px] pl-4 pr-12 py-4 rounded-2xl border-white/20 bg-white/10 text-white placeholder:text-white/50 backdrop-blur-md focus:bg-white/20 resize-none text-lg"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage();
                                        }
                                    }}
                                    disabled={isLoading || session.status === 'completed'}
                                />
                                <Button
                                    id="send-button"
                                    size="icon"
                                    className="absolute right-2 top-2 h-10 w-10 rounded-xl"
                                    onClick={sendMessage}
                                    disabled={isLoading || !userInput.trim() || session.status === 'completed'}
                                >
                                    <Send className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex justify-center items-center gap-4 text-xs text-white/40">
                            <span className={`flex items-center gap-1.5 ${
                                isRecording ? 'text-red-400 font-medium' :
                                transcriptionInProgress ? 'text-blue-400 font-medium' : ''
                            }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                    isRecording ? 'bg-red-500 animate-ping' :
                                    transcriptionInProgress ? 'bg-blue-500 animate-pulse' :
                                    'bg-white/20'
                                }`} />
                                {transcriptionInProgress ? 'Trascrizione Whisper...' :
                                 isRecording ? 'Registrazione Attiva (Parla liberamente)' :
                                 'Pronto per Registrare'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Switch
                                    checked={fluidMode}
                                    onCheckedChange={setFluidMode}
                                    className="scale-75 data-[state=checked]:bg-primary"
                                />
                                Modalità Fluida
                            </span>
                        </div>
                    </div>
                </div>

                {/* COUNTDOWN OVERLAY FOR FLUID MODE */}
                {countdown !== null && (
                    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white/10 p-8 rounded-3xl border border-white/20 text-center shadow-2xl backdrop-blur-md max-w-sm w-full mx-4">
                            <div className="text-5xl font-bold text-white mb-2 font-mono">
                                {countdown}
                            </div>
                            <p className="text-white/80 text-lg mb-6">Invio risposta automatico...</p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    size="lg"
                                    onClick={handleResumeSpeaking}
                                    className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
                                >
                                    <Mic className="h-5 w-5 mr-2" />
                                    Continua a Parlare
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setCountdown(null);
                                        if (countdownRef.current) clearTimeout(countdownRef.current);
                                    }}
                                    className="w-full border-white/20 text-white hover:bg-white/10"
                                >
                                    Annulla Invio
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status Indicators */}
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-black/80 p-6 rounded-2xl flex flex-col items-center gap-4 text-white">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p>Il professore sta valutando...</p>
                        </div>
                    </div>
                )}
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
                        {session.feedback.score < 18 ? (
                            <p className="text-red-500 font-bold mt-2">NON SUPERATO</p>
                        ) : (
                            <p className="text-muted-foreground mt-2">Esame Completato</p>
                        )}
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

                <div className="flex justify-center pt-4">
                    <Button onClick={() => window.location.reload()} size="lg">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Nuova Simulazione
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
