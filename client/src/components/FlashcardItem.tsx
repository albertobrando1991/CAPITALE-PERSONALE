import { useSpecialista } from '@/contexts/SpecialistaContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { Flashcard } from '@shared/schema';

interface FlashcardItemProps {
  flashcard: Flashcard;
}

export function FlashcardItem({ flashcard }: FlashcardItemProps) {
  const { navigaASpecialista } = useSpecialista();

  const handleChiediSpecialista = () => {
    const testo = `Domanda: ${flashcard.fronte}\n\nRisposta: ${flashcard.retro}`;
    navigaASpecialista(testo);
  };

  // Determina colore badge basato su stato
  const getBadgeVariant = () => {
    if (flashcard.tentativiTotali === 0 || !flashcard.tentativiTotali) {
      return { className: 'bg-gray-300 text-gray-700', text: 'Non studiata' };
    }
    if (flashcard.livelloSRS !== null && flashcard.livelloSRS >= 3) {
      return { className: 'bg-green-500 text-white', text: '✅ Facile' };
    }
    if (flashcard.masterate) {
      return { className: 'bg-green-500 text-white', text: '✅ Masterata' };
    }
    return { className: 'bg-red-500 text-white', text: '❌ Da ripassare' };
  };

  const badgeInfo = getBadgeVariant();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header con badge */}
        <div className="flex items-start justify-between mb-3">
          <Badge className={badgeInfo.className}>
            {badgeInfo.text}
          </Badge>
          <div className="text-xs text-gray-500">
            {flashcard.numeroRipetizioni && flashcard.numeroRipetizioni > 0 && (
              <span>🔄 {flashcard.numeroRipetizioni} ripetizioni</span>
            )}
          </div>
        </div>

        {/* Contenuto flashcard */}
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Domanda
            </span>
            <p className="text-sm mt-1 text-gray-800 leading-relaxed line-clamp-3">
              {flashcard.fronte}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Risposta
            </span>
            <p className="text-sm mt-1 text-gray-800 leading-relaxed line-clamp-3">
              {flashcard.retro}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1">
            <span>📚</span>
            <span>{flashcard.materia || 'Generale'}</span>
          </span>
          {flashcard.fonte && (
            <span className="flex items-center gap-1">
              <span>📄</span>
              <span className="truncate max-w-[200px]" title={flashcard.fonte}>
                {flashcard.fonte}
              </span>
            </span>
          )}
          {flashcard.prossimoRipasso && (
            <span className="flex items-center gap-1">
              <span>📅</span>
              <span>
                {new Date(flashcard.prossimoRipasso) <= new Date() 
                  ? 'Da rivedere oggi' 
                  : `Prossimo: ${new Date(flashcard.prossimoRipasso).toLocaleDateString('it-IT')}`
                }
              </span>
            </span>
          )}
        </div>

        {/* Pulsante Specialista */}
        <Button
          onClick={handleChiediSpecialista}
          variant="outline"
          size="sm"
          className="w-full group hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 transition-all"
        >
          <Sparkles className="w-4 h-4 mr-2 text-blue-600 group-hover:text-purple-600 transition-colors" />
          <span className="font-medium text-blue-700 group-hover:text-purple-700 transition-colors">
            Chiedi allo Specialista
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
