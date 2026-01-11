import { useState, useEffect } from 'react';
import { MessageSquare, Sparkles, Save, History, Lightbulb, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBenessere } from '@/contexts/BenessereContext';

interface ReframingLog {
  id: number;
  anxiousThought: string;
  reframedThought: string;
  aiSuggestion: string | null;
  effectivenessRating: number | null;
  context: string | null;
  createdAt: string;
}

interface AIReframeResponse {
  originalThought: string;
  reframedThought: string;
  explanation: string;
  activationType: 'anxiety' | 'excitement';
  confidence: number;
  aiModel: string;
}

export default function ReframingCoach() {
  const { toast } = useToast();
  const { refreshStats } = useBenessere();

  // Form state
  const [anxiousThought, setAnxiousThought] = useState('');
  const [reframedThought, setReframedThought] = useState('');
  const [context, setContext] = useState('pre_exam');
  const [aiSuggestion, setAiSuggestion] = useState<AIReframeResponse | null>(null);
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(true); // Default aperto per mostrare i salvataggi
  const [history, setHistory] = useState<ReframingLog[]>([]);

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/benessere/reframing?limit=10', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Reframing history data:', data);
        setHistory(data);
      }
    } catch (error) {
      console.error('Errore fetch reframing history:', error);
    }
  };

  const handleGenerateReframe = async () => {
    if (!anxiousThought?.trim()) {
      toast({
        title: "Campo vuoto",
        description: "Inserisci un pensiero ansioso da ristrutturare",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setAiSuggestion(null);

    try {
      const res = await fetch('/api/benessere/reframing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ anxiousThought })
      });

      if (!res.ok) {
        throw new Error('Errore nella generazione');
      }

      const data: AIReframeResponse = await res.json();
      setAiSuggestion(data);
      setReframedThought(data.reframedThought);

      toast({
        title: "✨ Reframe Generato!",
        description: "Rivedi il suggerimento dell'AI e salvalo se ti è utile",
        duration: 3000
      });

    } catch (error) {
      console.error('Errore generate reframe:', error);
      toast({
        title: "Errore AI",
        description: "Non è stato possibile generare il reframe. Riprova.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!anxiousThought?.trim() || !reframedThought?.trim()) {
      toast({
        title: "Campi incompleti",
        description: "Compila sia il pensiero ansioso che quello ristrutturato",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/benessere/reframing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          anxiousThought,
          reframedThought,
          aiSuggestion: aiSuggestion?.reframedThought || null,
          aiModel: aiSuggestion?.aiModel || null,
          effectivenessRating,
          context
        })
      });

      if (!res.ok) {
        throw new Error('Errore nel salvataggio');
      }

      await refreshStats();
      
      // Apri automaticamente lo storico e aggiorna la lista
      if (!showHistory) {
        setShowHistory(true);
      } else {
        fetchHistory();
      }

      toast({
        title: "💬 Reframe Salvato!",
        description: "Continua a praticare il reframing cognitivo",
        duration: 3000
      });

      // Reset form
      setAnxiousThought('');
      setReframedThought('');
      setAiSuggestion(null);
      setEffectivenessRating(null);
      setContext('pre_exam');

    } catch (error) {
      console.error('Errore save reframe:', error);
      toast({
        title: "Errore",
        description: "Non è stato possibile salvare il reframe",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/benessere/reframing/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Errore cancellazione');

      setHistory(history.filter(h => h.id !== id));
      await refreshStats();

      toast({
        title: "🗑️ Eliminato",
        description: "Reframe eliminato correttamente"
      });
    } catch (error) {
      console.error('Errore delete reframe:', error);
      toast({
        title: "Errore",
        description: "Impossibile eliminare il reframe",
        variant: "destructive"
      });
    }
  };

  const handleUseAISuggestion = () => {
    if (aiSuggestion) {
      setReframedThought(aiSuggestion.reframedThought);
    }
  };

  const commonExamples = [
    {
      anxious: "Ho paura di non farcela all'esame",
      reframed: "Sono eccitato di dimostrare quanto ho imparato"
    },
    {
      anxious: "Non sarò mai pronto in tempo",
      reframed: "Ho un piano strategico e ogni giorno mi avvicino all'obiettivo"
    },
    {
      anxious: "Gli altri sono più bravi di me",
      reframed: "Ognuno ha il proprio ritmo, io sto facendo progressi costanti"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Card Principale */}
      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageSquare className="h-6 w-6 text-orange-600" />
            Reframing Coach AI
          </CardTitle>
          <CardDescription>
            Trasforma l'ansia in eccitazione produttiva • Powered by Gemini 2.0
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Pensiero Ansioso */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="anxiousThought" className="text-base font-semibold">
                1️⃣ Il Tuo Pensiero Ansioso
              </Label>
              <Badge variant="outline" className="text-xs">
                Sii onesto
              </Badge>
            </div>
            <Textarea 
              id="anxiousThought" 
              placeholder={'Es: "Ho paura di non farcela all\'esame"'} 
              value={anxiousThought} 
              onChange={(e) => setAnxiousThought(e.target.value)} 
              rows={3} 
              className="text-base" 
            />
            <p className="text-xs text-muted-foreground">
              Scrivi esattamente cosa stai pensando quando sei ansioso. Non filtrare.
            </p>
          </div>

          {/* Bottone Genera AI */}
          <Button 
            onClick={handleGenerateReframe} 
            disabled={isGenerating || !anxiousThought?.trim()} 
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-lg h-14 gap-2" 
          >
            {isGenerating ? (
              <>
                <div className="animate-spin">⏳</div>
                Generazione in corso...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Genera Reframe con AI
              </>
            )}
          </Button>

          {/* Suggerimento AI */}
          {aiSuggestion && (
            <div className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Suggerimento AI
                </Label>
                <Badge 
                  variant={aiSuggestion.activationType === 'excitement' ? 'default' : 'secondary'} 
                  className="text-xs" 
                >
                  {aiSuggestion.activationType === 'excitement' ? '⚡ Eccitazione' : '😰 Ansia'}
                </Badge>
              </div>

              <div className="bg-white p-4 rounded-lg border border-purple-200">
                <p className="text-base font-semibold text-purple-900 mb-2">
                  "{aiSuggestion.reframedThought}"
                </p>
                <p className="text-sm text-muted-foreground">
                  💡 {aiSuggestion.explanation}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Confidence: {aiSuggestion.confidence}%</span>
                <span>Model: {aiSuggestion.aiModel}</span>
              </div>

              <Button 
                onClick={handleUseAISuggestion} 
                variant="outline" 
                size="sm" 
                className="w-full" 
              >
                Usa Questo Reframe →
              </Button>
            </div>
          )}

          {/* Step 2: Pensiero Ristrutturato */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reframedThought" className="text-base font-semibold">
                2️⃣ Pensiero Ristrutturato
              </Label>
              <Badge variant="default" className="text-xs bg-green-600">
                Potenziante
              </Badge>
            </div>
            <Textarea 
              id="reframedThought" 
              placeholder='Es: "Sono eccitato di dimostrare quanto ho imparato"' 
              value={reframedThought} 
              onChange={(e) => setReframedThought(e.target.value)} 
              rows={3} 
              className="text-base border-green-300 focus:border-green-500" 
            />
            <p className="text-xs text-muted-foreground">
              Puoi usare il suggerimento AI o scrivere il tuo reframe personalizzato.
            </p>
          </div>

          {/* Contesto */}
          <div className="space-y-2">
            <Label htmlFor="context">Contesto</Label>
            <Select value={context} onValueChange={setContext}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pre_exam">Prima dell'esame</SelectItem>
                <SelectItem value="during_study">Durante lo studio</SelectItem>
                <SelectItem value="after_mistake">Dopo un errore</SelectItem>
                <SelectItem value="general">Generale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Efficacia (opzionale, post-uso) */}
          {reframedThought && (
            <div className="space-y-2">
              <Label>Quanto è stato efficace questo reframe? (opzionale)</Label>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button 
                    key={rating} 
                    onClick={() => setEffectivenessRating(rating)} 
                    className={`text-3xl transition-all ${ 
                      rating <= (effectivenessRating || 0) ? 'scale-110' : 'opacity-30' 
                    }`} 
                  >
                    {rating <= (effectivenessRating || 0) ? '💚' : '🤍'}
                  </button> 
                ))}
              </div>
              {effectivenessRating && (
                <p className="text-xs text-center text-muted-foreground">
                  {effectivenessRating === 1 && 'Non molto utile'}
                  {effectivenessRating === 2 && 'Poco utile'}
                  {effectivenessRating === 3 && 'Abbastanza utile'}
                  {effectivenessRating === 4 && 'Molto utile'}
                  {effectivenessRating === 5 && 'Estremamente utile!'}
                </p>
              )}
            </div>
          )}

          {/* Salva */}
          <Button 
            onClick={handleSave} 
            disabled={isSaving || !anxiousThought?.trim() || !reframedThought?.trim()} 
            className="w-full bg-orange-600 hover:bg-orange-700 gap-2" 
            size="lg" 
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Salvataggio...' : 'Salva Reframe'}
          </Button>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Come Funziona il Reframing
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>L'attivazione fisiologica di ansia ed eccitazione è identica</li>
              <li>Cambia solo l'interpretazione cognitiva del cervello</li>
              <li>Praticando il reframing, rialleni il tuo dialogo interno</li>
              <li>Non è finto ottimismo: è ristrutturazione scientifica</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Esempi Comuni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Esempi di Reframing Efficaci
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commonExamples.map((example, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">❌</span> 
                  <p className="text-sm text-red-700">"{example.anxious}"</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-500 font-bold">✅</span> 
                  <p className="text-sm text-green-700 font-semibold">"{example.reframed}"</p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs" 
                  onClick={() => { 
                    setAnxiousThought(example.anxious); 
                    setReframedThought(example.reframed); 
                  }} 
                >
                  Usa questo esempio →
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Storico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              I Tuoi Reframes
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)} 
            >
              {showHistory ? 'Nascondi' : 'Mostra Storico'}
            </Button>
          </div>
        </CardHeader>

        {showHistory && (
          <CardContent>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nessun reframe salvato. Inizia a praticare!
                </p>
              ) : (
                history.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-4 bg-gradient-to-r from-red-50 to-green-50 rounded-lg border space-y-3" 
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>
                          {new Date(log.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {log.context && (
                          <Badge variant="outline" className="text-xs">
                            {log.context.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(log.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-red-500">❌</span> 
                        <p className="text-sm text-red-700">"{log.anxiousThought}"</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-green-500">✅</span> 
                        <p className="text-sm text-green-700 font-semibold">
                          "{log.reframedThought}"
                        </p>
                      </div>
                    </div>

                    {log.aiSuggestion && (
                      <div className="text-xs text-purple-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>AI suggestion used</span>
                      </div>
                    )}

                    {log.effectivenessRating && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Efficacia:</span>
                        <div>
                          {'💚'.repeat(log.effectivenessRating)}
                          {'🤍'.repeat(5 - log.effectivenessRating)}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}