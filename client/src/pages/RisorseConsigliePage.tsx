import { useState } from 'react'; 
import { useParams, useLocation } from 'wouter'; 
import { useQuery, useMutation } from '@tanstack/react-query'; 
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'; 
import { Button } from '@/components/ui/button'; 
import { Badge } from '@/components/ui/badge'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; 
import { Input } from '@/components/ui/input'; 
import { ExternalLink, BookOpen, Star, Search, ArrowLeft } from 'lucide-react'; 

const MATERIE = [ 
  'Tutte le materie', 
  'Testi Specifici per Concorsi Pubblici',
  'Diritto Amministrativo', 
  'Diritto Costituzionale', 
  'Diritto Civile', 
  'Contabilità Pubblica', 
  'Diritto del Lavoro', 
  'Economia Aziendale', 
  'Informatica', 
  'Lingua Inglese', 
]; 

export default function RisorseConsigliePage() { 
  const params = useParams();
  const concorsoId = params.concorsoId;
  const [, setLocation] = useLocation(); 
  const [materiaFiltro, setMateriaFiltro] = useState('Tutte le materie'); 
  const [searchQuery, setSearchQuery] = useState(''); 

  const { data: catalogo, isLoading } = useQuery({ 
    queryKey: ['catalogo-edises', materiaFiltro], 
    queryFn: async () => { 
      const materiaParam = materiaFiltro === 'Tutte le materie' ? '' : materiaFiltro; 
      const res = await fetch(`/api/catalogo-edises?materia=${materiaParam}`); 
      if (!res.ok) throw new Error('Errore caricamento catalogo'); 
      return res.json(); 
    }, 
  }); 

  const trackClickMutation = useMutation({ 
    mutationFn: async (isbn: string) => { 
      await fetch(`/api/catalogo-edises/${isbn}/track`, { method: 'POST' }); 
    }, 
  }); 

  const handleClickManuale = (manuale: any) => { 
    trackClickMutation.mutate(manuale.isbn); 
    window.open(manuale.linkAffiliato, '_blank', 'noopener,noreferrer'); 
  }; 

  const catalogoFiltrato = catalogo?.filter((m: any) => { 
    if (!searchQuery) return true; 
    const query = searchQuery.toLowerCase(); 
    return ( 
      m.titolo.toLowerCase().includes(query) || 
      m.autore.toLowerCase().includes(query) || 
      m.descrizione.toLowerCase().includes(query) 
    ); 
  }) || []; 

  return ( 
    <div className="max-w-7xl mx-auto p-6"> 
      {/* Header */} 
      <div className="mb-6"> 
        <Button 
          variant="ghost" 
          onClick={() => setLocation(`/concorsi/${concorsoId}/setup-fonti`)} 
          className="mb-4" 
        > 
          <ArrowLeft className="w-4 h-4 mr-2" /> Torna a Setup Fonti 
        </Button> 
        
        <h1 className="text-4xl font-bold mb-2">📚 Risorse Consigliate</h1> 
        <p className="text-lg text-muted-foreground"> 
          Manuali selezionati da esperti per la tua preparazione 
        </p> 
      </div> 

      {/* Disclaimer */} 
      <Alert className="mb-6"> 
        <AlertTitle className="text-base font-semibold">ℹ️ Informativa</AlertTitle> 
        <AlertDescription className="text-sm"> 
          I link sottostanti rimandano a siti esterni
        </AlertDescription> 
      </Alert> 

      {/* Filtri */} 
      <div className="grid md:grid-cols-2 gap-4 mb-6"> 
        {/* Filtro Materia */} 
        <div> 
          <label className="text-sm font-medium mb-2 block">Filtra per materia</label> 
          <Select value={materiaFiltro} onValueChange={setMateriaFiltro}> 
            <SelectTrigger> 
              <SelectValue /> 
            </SelectTrigger> 
            <SelectContent> 
              {MATERIE.map(m => ( 
                <SelectItem key={m} value={m}>{m}</SelectItem> 
              ))} 
            </SelectContent> 
          </Select> 
        </div> 

        {/* Ricerca */} 
        <div> 
          <label className="text-sm font-medium mb-2 block">Cerca</label> 
          <div className="relative"> 
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /> 
            <Input 
              placeholder="Cerca per titolo, autore..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="pl-10" 
            /> 
          </div> 
        </div> 
      </div> 

      {/* Loading */} 
      {isLoading && ( 
        <div className="text-center py-12"> 
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div> 
          <p className="text-muted-foreground">Caricamento catalogo...</p> 
        </div> 
      )} 

      {/* Risultati */} 
      {!isLoading && catalogoFiltrato.length === 0 && ( 
        <div className="text-center py-12"> 
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" /> 
          <p className="text-lg text-muted-foreground"> 
            Nessun manuale trovato per questa ricerca 
          </p> 
        </div> 
      )} 

      {/* Griglia Manuali */} 
      <div className="grid md:grid-cols-3 gap-6"> 
        {catalogoFiltrato.map((manuale: any) => ( 
          <Card key={manuale.isbn} className="flex flex-col hover:shadow-lg transition-shadow"> 
            <CardHeader className="p-0"> 
              <div className="relative"> 
                <img 
                  src={manuale.copertina} 
                  alt={manuale.titolo} 
                  className="w-full h-80 object-cover rounded-t-lg" 
                /> 
                {manuale.popolare && ( 
                  <Badge className="absolute top-3 right-3 bg-yellow-500"> 
                    <Star className="w-3 h-3 mr-1" /> Popolare 
                  </Badge> 
                )} 
              </div> 
            </CardHeader> 

            <CardContent className="flex-1 pt-4"> 
              <h3 className="font-bold text-lg mb-2 line-clamp-2"> 
                {manuale.titolo} 
              </h3> 
              <p className="text-sm text-muted-foreground mb-2"> 
                {manuale.autore} 
              </p> 
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2"> 
                {manuale.descrizione} 
              </p> 
              
              <div className="flex flex-wrap gap-2 mb-3"> 
                <Badge variant="secondary">{manuale.materia}</Badge> 
                {manuale.numPagine > 0 && <Badge variant="outline">{manuale.numPagine} pagine</Badge>}
                <Badge variant="outline">{['SIMONE-TESTI-SPECIFICI', 'EDISES-TESTI-SPECIFICI'].includes(manuale.isbn) ? 'Sempre aggiornato' : manuale.anno}</Badge> 
              </div> 
              
              {manuale.prezzo > 0 && (
                <p className="text-3xl font-bold text-primary"> 
                  €{(manuale.prezzo / 100).toFixed(2)}
                </p> 
              )}
            </CardContent> 
 

            <CardFooter className="pt-0"> 
              <Button 
                className="w-full" 
                variant="default" 
                onClick={() => handleClickManuale(manuale)} 
              > 
                Vai al sito Edises 
                <ExternalLink className="ml-2 w-4 h-4" /> 
              </Button> 
            </CardFooter> 
          </Card> 
        ))} 
      </div> 

      {/* Footer Info */} 
      {catalogoFiltrato.length > 0 && ( 
        <div className="mt-8 text-center text-sm text-muted-foreground"> 
          <p>Mostrando {catalogoFiltrato.length} {catalogoFiltrato.length === 1 ? 'manuale' : 'manuali'}</p> 
        </div> 
      )} 
    </div> 
  ); 
}