
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

export function FAQSection() {
    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent" />
            <div className="absolute top-[20%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

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
                        <p className="mx-auto max-w-[700px] text-slate-500 md:text-xl dark:text-slate-400 mt-4">
                            Tutto quello che devi sapere sulla piattaforma che sta rivoluzionando la preparazione ai concorsi.
                        </p>
                    </motion.div>
                </div>

                <motion.div
                    className="mx-auto max-w-3xl"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {faqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="border border-slate-200 dark:border-slate-800 rounded-xl px-6 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md transition-all duration-200 data-[state=open]:border-blue-500/30 dark:data-[state=open]:border-blue-400/30"
                            >
                                <AccordionTrigger className="text-left text-lg font-medium py-6 hover:no-underline [&[data-state=open]]:text-blue-600 dark:[&[data-state=open]]:text-blue-400">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-slate-600 dark:text-slate-400 text-base leading-relaxed pb-6">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </motion.div>
            </div>
        </section>
    );
}
