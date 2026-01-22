import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Search, GitMerge, BookOpenCheck, Trophy, HeartPulse } from "lucide-react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";

// Category colors for visual recognition
const categoryColors = {
  strategy: { border: "border-t-amber-500", bg: "bg-amber-500/10", text: "text-amber-500" },
  neuro: { border: "border-t-violet-500", bg: "bg-violet-500/10", text: "text-violet-500" },
  technique: { border: "border-t-cyan-500", bg: "bg-cyan-500/10", text: "text-cyan-500" },
  wellness: { border: "border-t-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-500" },
};

export function HowItWorksSection() {
  const modules = [
    {
      icon: Search,
      title: "1. Analisi Strategica e Intelligence",
      description: "Impara a decodificare la Lex Specialis (il bando) per estrarre i cluster informativi critici e dominare l'ecosistema digitale del portale inPA.",
      category: "strategy",
    },
    {
      icon: Brain,
      title: "2. Architettura Neurobiologica",
      description: "Ottimizza l'hardware del tuo cervello sfruttando la Ripetizione Spaziata per annullare la curva dell'oblio e il Recupero Attivo (Active Recall).",
      category: "neuro",
    },
    {
      icon: GitMerge,
      title: "3. Strategia Operativa",
      description: "Applica il Reverse Engineering alla tua tabella di marcia e utilizza l'Interlacciamento (Interleaving) tra le materie per eliminare l'illusione di competenza.",
      category: "strategy",
    },
    {
      icon: BookOpenCheck,
      title: "4. Il Cuore Tecnico (SQ3R+)",
      description: "Una tecnica di lettura attiva e scansione strutturata specifica per i testi giuridici e tecnici, che trasforma ogni ora di studio in valore reale.",
      category: "technique",
    },
    {
      icon: Trophy,
      title: "5. Allenamento alla Performance",
      description: "Domina i quiz RIPAM/Formez attraverso algoritmi risolutivi dedicati, gestisci banche dati massive con il metodo dei Bin e affronta i test situazionali.",
      category: "technique",
    },
    {
      icon: HeartPulse,
      title: "6. Ingegneria del Benessere",
      description: "Gestisci lo stress e l'ansia da prestazione con protocolli di respirazione quadrata e igiene del sonno per garantire che la tua memoria sia sempre al picco.",
      category: "wellness",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      rotateX: 15,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="w-full py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <motion.div
          className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary">
              Un Sistema Integrato in 6 Moduli
            </h2>
            <motion.div
              className="w-12 h-1 bg-secondary mx-auto"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <p className="max-w-[700px] text-muted-foreground md:text-lg font-sans font-light pt-4">
              Il percorso ti guiderà attraverso una trasformazione totale della tua metodologia di studio.
            </p>
          </div>
        </motion.div>

        {/* Layout a griglia 3x2 per i moduli con animazioni */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {modules.map((module, index) => {
            const colors = categoryColors[module.category as keyof typeof categoryColors];
            const IconComponent = module.icon;

            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className="h-full"
              >
                <TiltCard tiltAmount={8} className="h-full">
                  <Card
                    className={`border-border shadow-sm hover:shadow-xl transition-all duration-300 bg-white rounded-none border-t-4 ${colors.border} h-full relative overflow-hidden group`}
                  >
                    {/* Hover glow effect */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{
                        background: `radial-gradient(circle at center, ${module.category === 'strategy' ? 'rgba(251, 191, 36, 0.1)' : module.category === 'neuro' ? 'rgba(139, 92, 246, 0.1)' : module.category === 'technique' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(52, 211, 153, 0.1)'} 0%, transparent 70%)`,
                      }}
                    />

                    <CardHeader className="flex flex-col items-start space-y-4 pb-2 relative z-10">
                      <motion.div
                        className={`p-3 ${colors.bg} rounded-none`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <IconComponent className={`h-8 w-8 ${colors.text}`} />
                      </motion.div>
                      <CardTitle className="text-xl font-serif font-bold text-primary leading-tight group-hover:text-secondary transition-colors">
                        {module.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-left relative z-10">
                      <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
