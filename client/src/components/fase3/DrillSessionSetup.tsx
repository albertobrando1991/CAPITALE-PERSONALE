// ============================================================================
// DRILL SESSION SETUP COMPONENT
// File: client/src/components/fase3/DrillSessionSetup.tsx
// Selezione modalità e parametri drill (Standard + AI Generator)
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useFase3 } from '@/contexts/Fase3Context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Target, Zap, AlertCircle, TrendingUp, FileText, Bot, Upload } from 'lucide-react';

interface DrillSessionSetupProps {
  concorsoId: number;
  onStart: (config: DrillConfig) => void;
}

export interface DrillConfig {
  mode: 'weak' | 'topic' | 'pdf' | 'text';
  topicId?: string;
  totalQuestions: number;
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  generatedQuestions?: any[];
}

interface Materia {
  id: string;
  nomeMateria: string;
}

export default function DrillSessionSetup({ concorsoId, onStart }: DrillSessionSetupProps) {
  const { errorBins } = useFase3();
  
  // Standard Mode State
  const [mode, setMode] = useState<'weak' | 'topic'>('weak');
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  
  // AI Mode State
  const [aiType, setAiType] = useState<'pdf' | 'text'>('pdf');
  const [textInput, setTextInput] = useState("");
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

  // Common State
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [materie, setMaterie] = useState<Materia[]>([]);
  const [loadingMaterie, setLoadingMaterie] = useState(false);

  const activeErrorBins = errorBins.filter(b => !b.is_resolved);

  useEffect(() => {
    const fetchMaterie = async () => {
      try {
        setLoadingMaterie(true);
        // MODIFICA: Fetch argomenti (topics) dalle flashcards invece che materie SQ3R
        // Questo assicura che il menu mostri i materiali caricati nella Fase 2
        const response = await fetch(`/api/fase3/${concorsoId}/topics`);
        if (response.ok) {
          const data = await response.json();
          // Filtra "Generale" se presente, come richiesto dall'utente
          setMaterie(data.filter((m: Materia) => m.nomeMateria !== 'Generale'));
        }
      } catch (error) {
        console.error('Errore caricamento materie:', error);
      } finally {
        setLoadingMaterie(false);
      }
    };

    fetchMaterie();
  }, [concorsoId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedQuestions([]);
    try {
        const formData = new FormData();
        formData.append('type', aiType);
        formData.append('num_questions', totalQuestions.toString());
        
        if (aiType === 'pdf' && fileInput) {
            formData.append('file', fileInput);
        } else if (aiType === 'text') {
            formData.append('content', textInput);
        } else {
            return; // Missing required fields
        }

        const response = await fetch(`/api/fase3/${concorsoId}/generate-questions`, {
            method: 'POST',
            body: formData, // Fetch handles Content-Type for FormData
        });

        if (!response.ok) throw new Error("Errore generazione");
        
        const data = await response.json();
        setGeneratedQuestions(data.questions || []);
    } catch (error) {
        console.error("Errore generazione:", error);
        alert("Errore durante la generazione delle domande. Riprova.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleStartStandard = () => {
    const config: DrillConfig = {
      mode,
      topicId: mode === 'topic' ? selectedTopicId : undefined,
      totalQuestions,
      difficulty
    };
    onStart(config);
  };

  const handleStartAI = () => {
      const config: DrillConfig = {
          mode: aiType, 
          totalQuestions: generatedQuestions.length,
          difficulty,
          generatedQuestions
      };
      onStart(config);
  };

  const canStartStandard = () => {
    if (mode === 'weak' && activeErrorBins.length === 0) return false;
    if (mode === 'topic' && !selectedTopicId) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Nuova Drill Session</h2>
        <p className="text-muted-foreground">
          Scegli come vuoi esercitarti: ripasso mirato o generazione AI.
        </p>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Modalità Standard</TabsTrigger>
          <TabsTrigger value="ai">Generatore AI ✨</TabsTrigger>
        </TabsList>
        
        {/* === STANDARD MODE === */}
        <TabsContent value="standard" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Modalità di Ripasso</CardTitle>
              <CardDescription>Usa le domande già presenti nel tuo database di studio</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weak Areas Only */}
                  <label
                    htmlFor="mode-weak"
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      mode === 'weak' ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="weak" id="mode-weak" />
                      <Target className="h-5 w-5 text-red-500" />
                      <span className="font-semibold">Weak Areas Only</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solo domande sulle tue aree deboli ({activeErrorBins.length} argomenti).
                    </p>
                    {activeErrorBins.length === 0 && (
                      <Alert className="mt-3 border-orange-500">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Nessuna area debole attiva.
                        </AlertDescription>
                      </Alert>
                    )}
                  </label>

                  {/* Topic Focus */}
                  <label
                    htmlFor="mode-topic"
                    className={`flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      mode === 'topic' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-3">
                      <RadioGroupItem value="topic" id="mode-topic" />
                      <Zap className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">Topic Focus</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ripassa le domande salvate per una materia specifica.
                    </p>
                  </label>
                </div>
              </RadioGroup>

              {mode === 'topic' && (
                <div className="mt-6">
                    <Label>Seleziona Argomento</Label>
                    <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                    <SelectTrigger>
                        <SelectValue placeholder={loadingMaterie ? "Caricamento..." : "Scegli una materia..."} />
                    </SelectTrigger>
                    <SelectContent>
                        {materie.map(materia => (
                        <SelectItem key={materia.id} value={materia.id}>
                            {materia.nomeMateria}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                </div>
              )}
            </CardContent>
          </Card>

           <Button
            size="lg"
            className="w-full"
            onClick={handleStartStandard}
            disabled={!canStartStandard()}
          >
            <Zap className="h-5 w-5 mr-2" />
            Inizia Sessione Standard
          </Button>
        </TabsContent>

        {/* === AI MODE === */}
        <TabsContent value="ai" className="space-y-6 mt-6">
             <Card>
                <CardHeader>
                    <CardTitle>Generatore Domande AI</CardTitle>
                    <CardDescription>Crea nuove domande partendo dai tuoi materiali</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Tabs value={aiType} onValueChange={(v) => setAiType(v as any)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="pdf">Da PDF</TabsTrigger>
                            <TabsTrigger value="text">Da Testo</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-4 p-4 border rounded-md bg-slate-50 dark:bg-slate-900">
                            {aiType === 'pdf' && (
                                <div className="space-y-4">
                                    <Label>Carica un documento PDF</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="file" 
                                            accept=".pdf" 
                                            onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Carica appunti o dispense. L'AI estrarrà il testo e creerà un quiz.
                                    </p>
                                </div>
                            )}

                            {aiType === 'text' && (
                                <div className="space-y-4">
                                    <Label>Incolla il testo da studiare</Label>
                                    <Textarea 
                                        placeholder="Incolla qui il testo..." 
                                        rows={8}
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </Tabs>

                    <div className="flex justify-end">
                        <Button 
                            onClick={handleGenerate} 
                            disabled={isGenerating || (aiType === 'pdf' && !fileInput) || (aiType === 'text' && !textInput)}
                        >
                            {isGenerating ? (
                                <>
                                    <Bot className="mr-2 h-4 w-4 animate-spin" /> Generazione in corso...
                                </>
                            ) : (
                                <>
                                    <Bot className="mr-2 h-4 w-4" /> Genera Anteprima
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Preview Area */}
                    {generatedQuestions.length > 0 && (
                        <div className="mt-6 border-t pt-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Zap className="text-yellow-500" />
                                    {generatedQuestions.length} Domande Generate
                                </h3>
                            </div>
                            
                            <div className="bg-muted p-4 rounded-lg mb-4 max-h-60 overflow-y-auto">
                                <ul className="space-y-2">
                                    {generatedQuestions.map((q, i) => (
                                        <li key={i} className="text-sm truncate">
                                            {i + 1}. {q.text || q.question}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Button size="lg" className="w-full" onClick={handleStartAI}>
                                Avvia Sessione con queste domande
                            </Button>
                        </div>
                    )}

                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>

      {/* Common Parameters (Difficulty/Count) - kept inside relevant sections or global if needed */}
      {/* For simplicity, I moved count/difficulty inside standard flow or keep global but apply to generation request */}
      
      <Card>
        <CardHeader>
          <CardTitle>Parametri Generali</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Numero Domande (Target)</Label>
                <Select
                value={totalQuestions.toString()}
                onValueChange={(v) => setTotalQuestions(parseInt(v))}
                >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="5">5 domande (Rapido)</SelectItem>
                    <SelectItem value="10">10 domande</SelectItem>
                    <SelectItem value="20">20 domande</SelectItem>
                    <SelectItem value="30">30 domande</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <div>
                <Label>Difficoltà</Label>
                <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as any)}
                >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Mista</SelectItem>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="hard">Difficile</SelectItem>
                </SelectContent>
                </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
