export function Logo({ className = "w-16 h-16" }: { className?: string }) {
  // Usiamo un timestamp per evitare il caching aggressivo del browser
  const timestamp = new Date().getTime();
  const logoSrc = `/logo.png?v=${timestamp}`;

  return (
    <img 
      src={logoSrc}
      alt="Capitale Personale Logo" 
      className={`object-contain ${className}`}
      onError={(e) => {
        console.error("ERRORE CARICAMENTO LOGO:", logoSrc);
        // Se fallisce, prova senza query param
        if (e.currentTarget.src.includes('?')) {
             e.currentTarget.src = "/logo.png";
        } else {
             e.currentTarget.style.display = 'none';
        }
      }}
    />
  );
}
