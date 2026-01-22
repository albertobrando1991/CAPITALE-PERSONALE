import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTASection() {
  return (
    <section className="w-full py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(251, 191, 36, 0.1) 100%)",
            "linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(37, 99, 235, 0.1) 50%, rgba(139, 92, 246, 0.1) 100%)",
            "linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(251, 191, 36, 0.1) 50%, rgba(37, 99, 235, 0.1) 100%)",
            "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(251, 191, 36, 0.1) 100%)",
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-secondary/40 rounded-full"
            style={{
              left: `${5 + i * 10}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.2, 0.7, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Bottom gold line with glow */}
      <motion.div
        className="absolute bottom-0 left-0 w-full h-1 bg-secondary"
        animate={{
          boxShadow: [
            "0 0 10px rgba(251, 191, 36, 0.5)",
            "0 0 30px rgba(251, 191, 36, 0.8)",
            "0 0 10px rgba(251, 191, 36, 0.5)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
        <motion.div
          className="flex flex-col items-center space-y-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Staggered text reveal */}
          <motion.h2
            className="text-3xl md:text-5xl font-serif font-bold tracking-tight max-w-4xl leading-tight"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            {["Non", "presentarti", "al", "concorso", "sperando", "nella", "fortuna."].map((word, i) => (
              <motion.span
                key={i}
                className="inline-block mr-3"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h2>

          {/* Animated underline */}
          <motion.div
            className="w-24 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />

          <motion.p
            className="mx-auto max-w-[800px] text-primary-foreground/80 md:text-xl font-sans font-light leading-relaxed"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            Adotta un sistema dove ogni variabile è sotto il tuo controllo e trasforma la tua preparazione in un risultato professionale certo.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(251, 191, 36, 0.4)",
                    "0 0 40px rgba(251, 191, 36, 0.6)",
                    "0 0 20px rgba(251, 191, 36, 0.4)",
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2, repeat: Infinity },
                  scale: { type: "spring", stiffness: 400 },
                }}
              >
                <Button
                  size="lg"
                  className="h-14 px-10 rounded-none bg-secondary text-primary hover:bg-secondary/90 font-sans font-bold tracking-widest uppercase shadow-lg hover:shadow-xl transition-all group"
                >
                  <Sparkles className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Inizia il Percorso
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
