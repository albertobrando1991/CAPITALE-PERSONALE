import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";

export function BenefitsSection() {
  const benefits = [
    {
      title: "Ordine Mentale",
      description: "Il sistema organizza ogni concetto in una struttura logica. Mai più confusione."
    },
    {
      title: "Continuità Operativa",
      description: "Riprendi esattamente da dove hai lasciato. Il sistema traccia ogni sessione."
    },
    {
      title: "Efficienza Temporale",
      description: "Ottimizza il tempo di studio focalizzandoti solo su ciò che non sai."
    },
    {
      title: "Controllo Totale",
      description: "Dashboard analitiche ti mostrano la realtà della tua preparazione."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const checkVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 10,
      },
    },
  };

  return (
    <section className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden">
      {/* Ambient background */}
      <motion.div
        className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-primary leading-tight">
              Perché scegliere <br />
              <span className="italic text-primary/80">Capitale Personale</span>?
            </h2>
            <motion.div
              className="w-16 h-1 bg-secondary"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <p className="text-muted-foreground md:text-lg font-sans font-light leading-relaxed">
              Abbiamo eliminato il superfluo. Abbiamo progettato ogni funzionalità pensando
              alle reali necessità di chi deve performare ad alto livello.
            </p>

            {/* Progress visualization */}
            <motion.div
              className="space-y-3 pt-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Efficacia del metodo</span>
                <motion.div
                  className="flex-1 h-2 bg-muted rounded-full overflow-hidden"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className="h-full bg-gradient-to-r from-secondary to-amber-500 rounded-full"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                </motion.div>
                <span className="font-bold text-primary">94%</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="grid gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
              >
                <TiltCard tiltAmount={5} className="w-full">
                  <div className="flex gap-4 items-start group p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-transparent hover:border-secondary/30 hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                    {/* Hover glow */}
                    <motion.div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{
                        background: "radial-gradient(circle at left center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)",
                      }}
                    />

                    <motion.div
                      className="mt-1 bg-primary text-secondary p-1.5 shrink-0 relative z-10"
                      variants={checkVariants}
                      whileHover={{
                        scale: 1.2,
                        rotate: 360,
                        boxShadow: "0 0 20px rgba(251, 191, 36, 0.5)"
                      }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Check className="h-4 w-4" />
                    </motion.div>
                    <div className="relative z-10">
                      <h3 className="text-lg font-serif font-bold text-primary group-hover:text-secondary transition-colors">
                        {benefit.title}
                      </h3>
                      <p className="text-muted-foreground font-sans text-sm mt-1 leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
