import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Brain, Sparkles, Target, Zap } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { StaggeredText } from "@/components/ui/staggered-text";
import { TiltCard, GlassmorphicCard } from "@/components/ui/tilt-card";
import { MovingBorderButton } from "@/components/ui/moving-border";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  // Parallax transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);
  const opacityFade = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <AuroraBackground>
      <section ref={sectionRef} className="w-full min-h-screen flex flex-col items-center justify-center text-center px-4 py-24 md:py-32 lg:py-40 relative overflow-hidden">

        {/* Background particles layer - small, distant */}
        <motion.div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ y: backgroundY }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`bg-${i}`}
              className="absolute w-1 h-1 bg-amber-400/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: 4 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>

        {/* Foreground particles layer - larger, closer with depth effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 20 }}>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`fg-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                background: `radial-gradient(circle, ${i % 2 === 0 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(139, 92, 246, 0.5)'} 0%, transparent 70%)`,
                boxShadow: `0 0 20px ${i % 2 === 0 ? 'rgba(251, 191, 36, 0.4)' : 'rgba(139, 92, 246, 0.3)'}`,
              }}
              animate={{
                y: [0, -50, 0],
                x: [0, i % 2 === 0 ? 20 : -20, 0],
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.3, 0.8],
              }}
              transition={{
                duration: 5 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Ambient glow orbs for depth */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <motion.div
          className="container px-4 md:px-6 mx-auto relative z-10"
          style={{ y: textY, opacity: opacityFade }}
        >
          <div className="flex flex-col items-center space-y-8 max-w-5xl mx-auto">

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
              </motion.div>
              <span className="text-sm text-white/80 font-medium">Protocollo Avanzato di Apprendimento</span>
            </motion.div>

            {/* Main Title with Staggered Reveal */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white leading-tight">
              <StaggeredText
                text="La disciplina batte la motivazione."
                wordClassName="text-white"
              />
            </h1>

            {/* Animated Separator with glow */}
            <motion.div
              className="w-32 h-[3px] bg-gradient-to-r from-transparent via-amber-400 to-transparent relative"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
            >
              <motion.div
                className="absolute inset-0 bg-amber-400 blur-md"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

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
              initial={{ opacity: 0, y: 30, rotateX: 15 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ duration: 0.8, delay: 1.8, type: "spring", stiffness: 100 }}
              className="mt-8"
            >
              <TiltCard className="cursor-pointer" tiltAmount={12}>
                <GlassmorphicCard className="p-6 md:p-8 relative overflow-hidden">
                  {/* Animated border glow */}
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-50"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{
                      backgroundPosition: ["200% 0", "-200% 0"],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="grid grid-cols-3 gap-6 md:gap-10 relative z-10">
                    {[
                      { icon: Brain, color: "indigo", label: "SQ3R Method" },
                      { icon: Zap, color: "amber", label: "Active Recall" },
                      { icon: Target, color: "cyan", label: "Error Binning" },
                    ].map((item, idx) => (
                      <motion.div
                        key={idx}
                        className="flex flex-col items-center gap-2"
                        whileHover={{ scale: 1.1, y: -5 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <motion.div
                          className={`w-12 h-12 rounded-xl bg-${item.color}-500/20 flex items-center justify-center relative`}
                          whileHover={{
                            boxShadow: `0 0 25px rgba(${item.color === 'indigo' ? '99, 102, 241' : item.color === 'amber' ? '251, 191, 36' : '34, 211, 238'}, 0.5)`
                          }}
                        >
                          <item.icon className={`w-6 h-6 text-${item.color}-400`} />
                        </motion.div>
                        <span className="text-white/80 text-xs md:text-sm font-medium">{item.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassmorphicCard>
              </TiltCard>
            </motion.div>

            {/* CTA Buttons with enhanced animations */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 2.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(251, 191, 36, 0.3)",
                    "0 0 40px rgba(251, 191, 36, 0.5)",
                    "0 0 20px rgba(251, 191, 36, 0.3)",
                  ],
                }}
                transition={{
                  boxShadow: { duration: 2, repeat: Infinity },
                  scale: { type: "spring", stiffness: 400 }
                }}
                className="rounded-lg"
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
              </motion.div>
              <Link href="/login">
                <motion.div
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 px-8 text-white/80 hover:text-white hover:bg-white/10 border border-white/20 rounded-lg font-medium tracking-wider uppercase text-sm"
                  >
                    Accedi
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll indicator with enhanced pulse */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ opacity: opacityFade }}
        >
          <motion.div
            className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2 relative"
            animate={{
              boxShadow: ["0 0 10px rgba(255,255,255,0.1)", "0 0 20px rgba(255,255,255,0.2)", "0 0 10px rgba(255,255,255,0.1)"]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              className="w-1.5 h-1.5 bg-white/60 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </section>
    </AuroraBackground>
  );
}
