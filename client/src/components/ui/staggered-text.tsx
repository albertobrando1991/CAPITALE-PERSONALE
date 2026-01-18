import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StaggeredTextProps {
    text: string;
    className?: string;
    wordClassName?: string;
    delay?: number;
}

export function StaggeredText({
    text,
    className,
    wordClassName,
    delay = 0
}: StaggeredTextProps) {
    const words = text.split(" ");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.12,
                delayChildren: delay,
            },
        },
    };

    const wordVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            filter: "blur(10px)",
        },
        visible: {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            transition: {
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
            },
        },
    };

    return (
        <motion.span
            className={cn("inline-flex flex-wrap justify-center", className)}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {words.map((word, index) => (
                <motion.span
                    key={`${word}-${index}`}
                    variants={wordVariants}
                    className={cn("inline-block mr-[0.25em]", wordClassName)}
                >
                    {word}
                </motion.span>
            ))}
        </motion.span>
    );
}

interface TypewriterTextProps {
    text: string;
    className?: string;
    delay?: number;
    speed?: number;
}

export function TypewriterText({
    text,
    className,
    delay = 0,
    speed = 0.05
}: TypewriterTextProps) {
    const characters = text.split("");

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: speed,
                delayChildren: delay,
            },
        },
    };

    const charVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { duration: 0.01 },
        },
    };

    return (
        <motion.span
            className={className}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {characters.map((char, index) => (
                <motion.span
                    key={`${char}-${index}`}
                    variants={charVariants}
                >
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
}
