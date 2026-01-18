import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Brain, Sparkles, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { StaggeredText } from "@/components/ui/staggered-text";
import { TiltCard, GlassmorphicCard } from "@/components/ui/tilt-card";
import { MovingBorderButton } from "@/components/ui/moving-border";

export function HeroSection() {
  return (
    <AuroraBackground>
      <section className="w-full min-h-screen flex flex-col items-center justify-center text-center px-4 py-24 md:py-32 lg:py-40 relative">
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-white/80 font-medium">Protocollo Avanzato di Apprendimento</span>
            </motion.div>

            {/* Main Title with Staggered Reveal */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white leading-tight">
              <StaggeredText
                text="La disciplina batte la motivazione."
                wordClassName="text-white"
              />
            </h1>

            {/* Animated Separator */}
            <motion.div
              className="w-32 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            />

            {/* Subtitle */}
            <motion.div
              className="mx-auto max-w-[900px] space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.5 }}
            >
              <p className="text-lg md:text-xl text-white/90 font-light leading-relaxed">
                L'architettura definitiva per trasformare la preparazione ai concorsi pubblici
                da sforzo caotico a <span className="text-amber-400 font-medium">processo scientifico</span> ad alte prestazioni.
              </p>
            </motion.div>

            {/* Interactive 3D Card Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.8 }}
              className="mt-8"
            >
              <TiltCard className="cursor-pointer" tiltAmount={10}>
                <GlassmorphicCard className="p-6 md:p-8">
                  <div className="grid grid-cols-3 gap-6 md:gap-10">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-indigo-400" />
                      </div>
                      <span className="text-white/80 text-xs md:text-sm font-medium">SQ3R Method</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-amber-400" />
                      </div>
                      <span className="text-white/80 text-xs md:text-sm font-medium">Active Recall</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <Target className="w-6 h-6 text-cyan-400" />
                      </div>
                      <span className="text-white/80 text-xs md:text-sm font-medium">Error Binning</span>
                    </div>
                  </div>
                </GlassmorphicCard>
              </TiltCard>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.2 }}
            >
              <Link href="/register">
                <MovingBorderButton
                  borderRadius="0.5rem"
                  duration={4}
                  className="text-sm md:text-base font-semibold tracking-wide uppercase"
                >
                  Inizia il Percorso
                  <ArrowRight className="ml-2 h-4 w-4 inline" />
                </MovingBorderButton>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 px-8 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 rounded-lg font-medium tracking-wider uppercase text-sm"
                >
                  Accedi
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
            <motion.div
              className="w-1.5 h-1.5 bg-white/60 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>
    </AuroraBackground>
  );
}

