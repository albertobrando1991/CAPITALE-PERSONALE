
import React from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
    {
        question: "Che cos'è Capitale Personale?",
        answer: "Capitale Personale è una piattaforma avanzata per la preparazione ai concorsi pubblici che utilizza l'Intelligenza Artificiale Generativa per trasformare i tuoi materiali di studio in quiz, flashcard e spiegazioni personalizzate."
    },
    {
        question: "Come funziona l'analisi dei bandi?",
        answer: "Carica il PDF del bando di concorso e la nostra AI estrarrà automaticamente tutte le informazioni chiave: requisiti, scadenze, materie da studiare e struttura delle prove, creando un piano di studio su misura per te."
    },
    {
        question: "Posso caricare i miei materiali di studio?",
        answer: "Assolutamente sì. Puoi caricare dispense, leggi, manuali in PDF o Word. L'AI li analizzerà per generare domande a risposta multipla, flashcard e riassunti basati esattamente sulle tue fonti."
    },
    {
        question: "L'Intelligenza Artificiale è affidabile?",
        answer: "Utilizziamo i modelli di linguaggio più avanzati (come GPT-4 e Claude 3.5 Sonnet) ottimizzati per il contesto giuridico e amministrativo italiano. Ogni risposta è corredata dai riferimenti alla fonte originale per permetterti di verificare sempre le informazioni."
    },
    {
        question: "È previsto un piano gratuito?",
        answer: "Sì, offriamo un periodo di prova gratuito per testare le funzionalità principali della piattaforma. Successivamente potrai scegliere tra diversi piani di abbonamento flessibili in base alle tue esigenze."
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.3,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 15,
        },
    },
};

export function FAQSection() {
    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />

            {/* Animated background orbs */}
            <motion.div
                className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div
                className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-3xl pointer-events-none"
                animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 8, repeat: Infinity, delay: 2 }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
                        style={{
                            left: `${10 + i * 12}%`,
                            top: `${20 + (i % 3) * 25}%`,
                        }}
                        animate={{
                            y: [0, -25, 0],
                            opacity: [0.2, 0.6, 0.2],
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

            <div className="container px-4 md:px-6 relative z-10">
                <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                            Domande Frequenti
                        </h2>
                        <motion.div
                            className="w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-4"
                            initial={{ scaleX: 0 }}
                            whileInView={{ scaleX: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                        />
                        <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl dark:text-slate-400 mt-4">
                            Tutto quello che devi sapere sulla piattaforma che sta rivoluzionando la preparazione ai concorsi.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    className="mx-auto max-w-3xl"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <AccordionItem
                                    value={`item-${index}`}
                                    className="border border-slate-200 dark:border-slate-800 rounded-xl px-6 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-lg transition-all duration-300 data-[state=open]:border-blue-500/50 dark:data-[state=open]:border-blue-400/50 data-[state=open]:shadow-lg data-[state=open]:shadow-blue-500/10 overflow-hidden group"
                                >
                                    <AccordionTrigger className="text-left text-lg font-medium py-6 hover:no-underline [&[data-state=open]]:text-blue-600 dark:[&[data-state=open]]:text-blue-400 group-hover:text-blue-500 transition-colors">
                                        <motion.span
                                            className="flex items-center gap-3"
                                            whileHover={{ x: 5 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            <motion.span
                                                className="w-2 h-2 rounded-full bg-blue-500/50 group-[[data-state=open]]:bg-blue-500"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            />
                                            {faq.question}
                                        </motion.span>
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-600 dark:text-slate-400 text-base leading-relaxed pb-6">
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {faq.answer}
                                        </motion.div>
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    );
}
