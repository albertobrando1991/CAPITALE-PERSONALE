import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, X, Crown } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { TiltCard } from "@/components/ui/tilt-card";

// Animated counter component
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inView.current) {
          inView.current = true;
          let start = 0;
          const end = value;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setDisplayValue(Math.floor(easeProgress * end));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{displayValue}</span>;
}

export function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: 0,
      period: "/mese",
      description: "Per iniziare a esplorare il metodo.",
      features: [
        { text: 'Upload 3 PDF', included: true },
        { text: '5 sintesi AI al mese', included: true },
        { text: 'Accesso base SQ3R', included: true },
        { text: 'Banca dati podcast', included: false },
        { text: 'Sintesi AI illimitate', included: false },
        { text: 'Assistenza personale', included: false },
      ],
      cta: "Inizia Gratis",
      ctaVariant: "outline" as const,
      highlight: false
    },
    {
      name: "Premium",
      price: 19.90,
      period: "/mese",
      description: "Per chi vuole massimizzare i risultati.",
      features: [
        { text: 'Upload illimitati', included: true },
        { text: 'Sintesi AI illimitate', included: true },
        { text: 'Accesso completo SQ3R', included: true },
        { text: 'Banca dati podcast completa', included: true },
        { text: 'Audio recap automatici', included: true },
        { text: 'Assistenza personale', included: false },
      ],
      cta: "Passa a Premium",
      ctaVariant: "default" as const,
      highlight: true,
      badge: "Più Popolare"
    },
    {
      name: "Enterprise",
      price: 49.90,
      period: "/mese",
      description: "Supporto totale e personalizzato.",
      features: [
        { text: 'Tutto Premium +', included: true },
        { text: 'Assistenza 1:1 prioritaria', included: true },
        { text: 'Podcast personalizzati', included: true },
        { text: 'Mappe mentali custom', included: true },
        { text: 'Piano di studio personalizzato', included: true },
        { text: 'Call mensile con tutor', included: true },
      ],
      cta: "Contattaci",
      ctaVariant: "outline" as const,
      highlight: false
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

  const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <section className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden" id="pricing">
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-secondary/30 rounded-full"
            style={{
              left: `${15 + i * 18}%`,
              top: `${20 + (i % 2) * 60}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              delay: i * 0.7,
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
              Piani di Abbonamento
            </h2>
            <motion.div
              className="w-12 h-1 bg-secondary mx-auto"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <p className="max-w-[700px] text-muted-foreground md:text-lg font-sans font-light pt-4">
              Investi nella tua preparazione con strumenti professionali.
            </p>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              className={plan.highlight ? "md:-mt-4 md:mb-4" : ""}
            >
              <TiltCard tiltAmount={plan.highlight ? 8 : 5} className="h-full">
                <Card
                  className={`relative flex flex-col rounded-none border-t-4 ${plan.highlight
                      ? "border-t-secondary shadow-xl z-10 border-x-primary/10 border-b-primary/10"
                      : "border-t-primary border-border shadow-sm hover:shadow-lg"
                    } bg-white transition-all duration-300 h-full overflow-hidden group`}
                >
                  {/* Premium glow effect */}
                  {plan.highlight && (
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      animate={{
                        boxShadow: [
                          "inset 0 0 20px rgba(251, 191, 36, 0.1)",
                          "inset 0 0 40px rgba(251, 191, 36, 0.2)",
                          "inset 0 0 20px rgba(251, 191, 36, 0.1)",
                        ],
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    />
                  )}

                  {/* Hover gradient */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: plan.highlight
                        ? "radial-gradient(circle at top center, rgba(251, 191, 36, 0.1) 0%, transparent 70%)"
                        : "radial-gradient(circle at top center, rgba(37, 99, 235, 0.05) 0%, transparent 70%)",
                    }}
                  />

                  {plan.highlight && plan.badge && (
                    <motion.div
                      className="absolute -top-5 left-1/2 -translate-x-1/2"
                      initial={{ y: -20, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      <motion.div
                        animate={{
                          boxShadow: [
                            "0 0 10px rgba(251, 191, 36, 0.3)",
                            "0 0 25px rgba(251, 191, 36, 0.5)",
                            "0 0 10px rgba(251, 191, 36, 0.3)",
                          ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="rounded-full"
                      >
                        <Badge className="bg-secondary text-primary hover:bg-secondary/90 px-4 py-1.5 rounded-full font-sans font-bold uppercase text-xs tracking-wider">
                          <Crown className="w-3 h-3 mr-1" /> {plan.badge}
                        </Badge>
                      </motion.div>
                    </motion.div>
                  )}

                  <CardHeader className="text-center pb-2 relative z-10">
                    <CardTitle className="text-2xl font-serif font-bold text-primary">
                      {plan.name}
                    </CardTitle>
                    <div className="mt-4 flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-primary">
                        €<AnimatedCounter value={Math.floor(plan.price)} />
                        {plan.price % 1 !== 0 && (
                          <span className="text-2xl">.{((plan.price % 1) * 100).toFixed(0)}</span>
                        )}
                      </span>
                      <span className="text-muted-foreground font-sans font-light">{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans mt-2">
                      {plan.description}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 pt-6 relative z-10">
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <motion.li
                          key={i}
                          className="flex items-start gap-3 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          {feature.included ? (
                            <motion.div
                              whileHover={{ scale: 1.2, rotate: 360 }}
                              transition={{ type: "spring" }}
                            >
                              <Check className="w-5 h-5 text-secondary shrink-0" />
                            </motion.div>
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/30 shrink-0" />
                          )}
                          <span className={`font-sans ${feature.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                            {feature.text}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-6 pb-8 relative z-10">
                    <Link href={plan.name === "Enterprise" ? "mailto:info@capitalepersonale.com" : "/register"} className="w-full">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          className={`w-full rounded-none h-12 font-sans font-semibold tracking-wide uppercase ${plan.highlight
                              ? "bg-primary text-secondary hover:bg-primary/90"
                              : "border-primary text-primary hover:bg-primary/5"
                            }`}
                          variant={plan.highlight ? "default" : "outline"}
                        >
                          {plan.cta}
                        </Button>
                      </motion.div>
                    </Link>
                  </CardFooter>
                </Card>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
