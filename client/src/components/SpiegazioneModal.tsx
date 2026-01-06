import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SpiegazioneModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcardId: string;
  domanda: string;
  materia: string;
}

export function SpiegazioneModal({
  isOpen,
  onClose,
  flashcardId,
  domanda,
  materia
}: SpiegazioneModalProps) {
  const [spiegazione, setSpiegazione] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copiato, setCopiato] = useState(false);

  const richiedeSpiegazione = async () => {
    setLoading(true);
    setSpiegazione('');
    
    try {
      const url = `/api/flashcards/${flashcardId}/spiega`;
      console.log('💡 Richiesta spiegazione per flashcard:', flashcardId, 'URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Risposta non JSON ricevuta:", text.substring(0, 200));
        throw new Error(`Il server ha restituito una risposta non valida (${response.status}). Potrebbe essere necessario effettuare nuovamente il login.`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'Errore nella richiesta');
      }
      
      const data = await response.json();
      console.log('✅ Spiegazione ricevuta');
      
      setSpiegazione(data.spiegazione);
      
    } catch (error: any) {
      console.error('❌ Errore:', error);
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare la spiegazione. Riprova.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copiaSpiegazione = async () => {
    try {
      await navigator.clipboard.writeText(spiegazione);
      setCopiato(true);
      toast({
        title: "Copiato!",
        description: "Spiegazione copiata negli appunti.",
        variant: "default"
      });
      
      setTimeout(() => setCopiato(false), 2000);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il testo.",
        variant: "destructive"
      });
    }
  };

  // Auto-richiedi quando si apre
  useEffect(() => {
    if (isOpen && !spiegazione && !loading) {
      richiedeSpiegazione();
    }
  }, [isOpen]); // Esegui solo quando isOpen cambia

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Spiegazione Semplificata
          </DialogTitle>
          <DialogDescription>
            <span className="text-xs text-gray-500">{materia}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Domanda */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900">
            {domanda}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">
              Sto preparando una spiegazione chiara per te...
            </p>
          </div>
        )}

        {/* Spiegazione */}
        {spiegazione && !loading && (
          <div className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {spiegazione}
                </div>
              </div>
            </div>

            {/* Azioni */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copiaSpiegazione} 
                className="flex-1"
              >
                {copiato ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                    Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copia Spiegazione
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={richiedeSpiegazione}
                disabled={loading}
              >
                Rigenera
              </Button>
              
              <Button 
                onClick={onClose} 
                size="sm" 
                className="flex-1"
              >
                Ho Capito!
              </Button>
            </div>
          </div>
        )}

        {/* Errore */}
        {!loading && !spiegazione && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Impossibile caricare la spiegazione
            </p>
            <Button onClick={richiedeSpiegazione}>
              Riprova
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}