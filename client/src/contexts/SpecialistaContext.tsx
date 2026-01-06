import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLocation, useSearch } from 'wouter';

interface SpecialistaContextType {
  testoPrecaricato: string;
  setTestoPrecaricato: (testo: string) => void;
  clearTesto: () => void;
  navigaASpecialista: (testo: string) => void;
}

const SpecialistaContext = createContext<SpecialistaContextType | undefined>(undefined);

export function SpecialistaProvider({ 
  children, 
  concorsoId 
}: { 
  children: ReactNode;
  concorsoId?: string;
}) {
  const [testoPrecaricato, setTestoPrecaricato] = useState('');
  const [location, navigate] = useLocation();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);

  // Sincronizza da URL al mount e quando cambia la query
  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam) {
      try {
        const decoded = decodeURIComponent(qParam);
        if (decoded !== testoPrecaricato) {
          setTestoPrecaricato(decoded);
        }
      } catch (error) {
        console.error('Errore decode URL:', error);
      }
    } else if (testoPrecaricato) {
      // Se non c'è più q nell'URL ma c'è testo nel context, pulisci
      setTestoPrecaricato('');
    }
  }, [searchString]);

  const clearTesto = () => {
    setTestoPrecaricato('');
    // Rimuovi anche da URL se presente
    if (searchParams.has('q')) {
      searchParams.delete('q');
      const basePath = location.split('?')[0];
      const newSearch = searchParams.toString();
      const newUrl = newSearch ? `${basePath}?${newSearch}` : basePath;
      navigate(newUrl, { replace: true });
    }
  };

  const navigaASpecialista = (testo: string) => {
    setTestoPrecaricato(testo);
    
    // Aggiorna URL con query param
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'specialista');
    newParams.set('q', encodeURIComponent(testo));
    
    const basePath = location.split('?')[0];
    const newUrl = `${basePath}?${newParams.toString()}`;
    navigate(newUrl);
  };

  return (
    <SpecialistaContext.Provider 
      value={{ 
        testoPrecaricato, 
        setTestoPrecaricato, 
        clearTesto,
        navigaASpecialista 
      }}
    >
      {children}
    </SpecialistaContext.Provider>
  );
}

export function useSpecialista() {
  const context = useContext(SpecialistaContext);
  if (!context) {
    throw new Error('useSpecialista deve essere usato dentro SpecialistaProvider');
  }
  return context;
}
