import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TiltCard } from "@/components/ui/tilt-card";

export function VisualGallerySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const images = [
    {
      src: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=cinematic%20shot%20of%20deep%20work%20study%20session%2C%20elegant%20desk%2C%20dark%20navy%20atmosphere%20with%20warm%20gold%20desk%20lamp%20light%2C%20high%20end%20photography&image_size=portrait_4_3",
      alt: "Focus e Disciplina",
      caption: "Focus Assoluto",
      desc: "Elimina le distrazioni. Il metodo crea l'ambiente mentale perfetto."
    },
    {
      src: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close%20up%20detailed%20shot%20of%20organized%20study%20materials%2C%20legal%20books%20and%20digital%20tablet%20with%20graphs%2C%20minimalist%20luxury%20aesthetic%2C%20blue%20and%20gold%20tones&image_size=portrait_4_3",
      alt: "Organizzazione Metodica",
      caption: "Organizzazione",
      desc: "Ogni risorsa al suo posto. Una dashboard digitale per la tua mente."
    },
    {
      src: "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=low%20angle%20shot%20of%20a%20determined%20professional%20person%20walking%20in%20a%20modern%20architectural%20corridor%2C%20silhouette%2C%20confident%20body%20language%2C%20blue%20hour%20lighting&image_size=portrait_4_3",
      alt: "Successo Professionale",
      caption: "Risultato",
      desc: "Non è magia, è ingegneria. Il tuo successo diventa prevedibile."
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.25,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0, rotateY: -10 },
    visible: {
      y: 0,
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut",
        type: "spring",
        stiffness: 80
      }
    }
  };

  return (
    <section className="w-full py-20 bg-background overflow-hidden relative" ref={ref}>
      {/* Ambient glow */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/5 rounded-full blur-3xl pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="container px-4 mx-auto relative z-10">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {images.map((img, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="h-[500px]"
            >
              <TiltCard tiltAmount={12} className="h-full w-full">
                <div className="group relative h-full w-full overflow-hidden border border-primary/10 shadow-lg hover:shadow-2xl transition-shadow duration-500">
                  {/* Image */}
                  <div className="absolute inset-0 bg-slate-900">
                    <motion.img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100"
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>

                  {/* Overlay Gradient with dynamic glow */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300"
                    whileHover={{
                      background: "linear-gradient(to top, rgba(37, 99, 235, 0.7), rgba(37, 99, 235, 0.1), transparent)"
                    }}
                  />

                  {/* Animated Corner Borders */}
                  <motion.div
                    className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-secondary/50 group-hover:border-secondary transition-colors duration-300"
                    whileHover={{
                      boxShadow: "0 0 15px rgba(251, 191, 36, 0.5)",
                      scale: 1.1
                    }}
                  />
                  <motion.div
                    className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-secondary/50 group-hover:border-secondary transition-colors duration-300"
                    whileHover={{
                      boxShadow: "0 0 15px rgba(251, 191, 36, 0.5)",
                      scale: 1.1
                    }}
                  />

                  {/* Animated border beam that follows the edges */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.3), transparent)",
                      backgroundSize: "200% 100%",
                    }}
                    animate={{
                      backgroundPosition: ["200% 0", "-200% 0"],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />

                  {/* Content */}
                  <motion.div
                    className="absolute bottom-0 left-0 w-full p-8"
                    initial={{ y: 10, opacity: 0.8 }}
                    whileHover={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      className="w-8 h-1 bg-secondary mb-4"
                      whileHover={{ width: 48, boxShadow: "0 0 10px rgba(251, 191, 36, 0.6)" }}
                      transition={{ duration: 0.3 }}
                    />
                    <h3 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide group-hover:text-secondary transition-colors duration-300">
                      {img.caption}
                    </h3>
                    <motion.p
                      className="text-white/80 font-sans font-light text-sm leading-relaxed max-w-[250px]"
                      initial={{ opacity: 0.7, y: 5 }}
                      whileHover={{ opacity: 1, y: 0 }}
                    >
                      {img.desc}
                    </motion.p>
                  </motion.div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
