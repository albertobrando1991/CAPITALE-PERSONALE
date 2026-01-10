import { useRef } from "react";
import { motion, useInView } from "framer-motion";

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
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="w-full py-20 bg-background overflow-hidden" ref={ref}>
      <div className="container px-4 mx-auto">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {images.map((img, index) => (
            <motion.div 
              key={index} 
              className="group relative h-[500px] w-full overflow-hidden border border-primary/10 shadow-lg"
              variants={itemVariants}
            >
              {/* Image */}
              <div className="absolute inset-0 bg-slate-900">
                <img 
                  src={img.src} 
                  alt={img.alt} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />
              </div>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300"></div>

              {/* Border Accent */}
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-secondary/50 group-hover:border-secondary transition-colors duration-300"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-secondary/50 group-hover:border-secondary transition-colors duration-300"></div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="w-8 h-1 bg-secondary mb-4"></div>
                <h3 className="text-2xl font-serif font-bold text-white mb-2 tracking-wide">
                  {img.caption}
                </h3>
                <p className="text-white/80 font-sans font-light text-sm leading-relaxed max-w-[250px]">
                  {img.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
