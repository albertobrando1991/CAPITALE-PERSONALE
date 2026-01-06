import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, RotateCcw, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSpecialista } from '@/contexts/SpecialistaContext';

export function SpecialistaLive({ concorsoId }: { concorsoId: string }) {
  const { toast } = useToast();
  const { testoPrecaricato, clearTesto } = useSpecialista();
  const [inputText, setInputText] = useState('');
  const [spiegazione, setSpiegazione] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carica testo precaricato quando arriva dal context
  useEffect(() => {
    if (testoPrecaricato && testoPrecaricato !== inputText) {
      setInputText(testoPrecaricato);
      setSpiegazione(''); // Reset spiegazione precedente
      setError('');
      
      // Focus e scroll smooth
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 150);
      
      // Mostra toast
      toast({ 
        title: 'Flashcard caricata!', 
        description: 'Clicca "Chiedi Spiegazione" per continuare',
      });
    }
  }, [testoPrecaricato]);

  const handleChiedi = async () => {
    if (!inputText.trim() || inputText.trim().length < 5) {
      setError('Inserisci un concetto da spiegare (minimo 5 caratteri)');
      return;
    }

    setIsLoading(true);
    setError('');
    setSpiegazione('');

    try {
      const response = await fetch('/api/specialista/spiega', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          concetto: inputText,
          concorsoId 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore nella richiesta' }));
        throw new Error(errorData.error || 'Errore nella richiesta');
      }

      const data = await response.json();
      setSpiegazione(data.spiegazione);
      
      toast({ title: 'Spiegazione ricevuta!' });
      
    } catch (err: any) {
      const errorMessage = err.message || 'Errore nel contattare lo specialista. Riprova.';
      setError(errorMessage);
      console.error('Errore specialista:', err);
      toast({ 
        title: 'Errore nella richiesta', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setSpiegazione('');
    setError('');
    clearTesto(); // Pulisci anche dal context
    textareaRef.current?.focus();
  };

  const handleCopiaSpiegazione = () => {
    navigator.clipboard.writeText(spiegazione)
      .then(() => toast({ title: 'Spiegazione copiata negli appunti!' }))
      .catch(() => toast({ title: 'Errore nella copia', variant: 'destructive' }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-7 h-7 text-blue-500" />
            Chiedi allo Specialista Live
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Incolla il testo di una flashcard o un concetto che non ti è chiaro. 
            Lo specialista AI ti fornirà una spiegazione semplice e diretta.
          </p>
        </CardHeader>
      </Card>

      {/* Input Area */}
      <Card>
        <CardContent className="pt-6">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Incolla qui il concetto da spiegare:
          </label>
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Es: Cos'è il procedimento amministrativo secondo la Legge 241/90?"
            className="min-h-[150px] mb-4 text-base"
            disabled={isLoading}
          />
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleChiedi}
              disabled={isLoading || !inputText.trim() || inputText.trim().length < 5}
              className="flex-1 h-12 text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Lo specialista sta pensando...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Chiedi Spiegazione
                </>
              )}
            </Button>

            {inputText && !isLoading && (
              <Button 
                onClick={handleReset}
                variant="outline"
                className="h-12"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risposta Specialista */}
      {spiegazione && (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Spiegazione dello Specialista
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopiaSpiegazione}
                title="Copia spiegazione"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {spiegazione}
              </div>
            </div>
            
            {/* Azioni */}
            <div className="flex gap-2 mt-6 pt-4 border-t border-blue-200">
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Nuova Domanda
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggerimenti */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 text-gray-800">💡 Suggerimenti per ottenere spiegazioni migliori:</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Incolla direttamente il testo completo di una flashcard usando il pulsante nelle card</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Chiedi chiarimenti su leggi, articoli, concetti giuridici o amministrativi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>La spiegazione sarà semplice, chiara e adatta alla preparazione del tuo concorso</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold">•</span>
              <span>Puoi fare una domanda alla volta per ricevere risposte più precise</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
