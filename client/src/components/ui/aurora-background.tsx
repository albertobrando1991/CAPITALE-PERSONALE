import { motion } from "framer-motion";

export function AuroraBackground({ children }: { children?: React.ReactNode }) {
    return (
        <div className="relative overflow-hidden bg-slate-950">
            {/* Aurora Gradient Layers */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Layer 1: Deep blue base pulse */}
                <motion.div
                    className="absolute -inset-[100%] opacity-50"
                    style={{
                        background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(59, 130, 246, 0.3), transparent)",
                    }}
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, 0],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Layer 2: Gold/Amber accent */}
                <motion.div
                    className="absolute -inset-[100%] opacity-40"
                    style={{
                        background: "radial-gradient(ellipse 60% 40% at 30% 60%, rgba(245, 158, 11, 0.25), transparent)",
                    }}
                    animate={{
                        scale: [1.2, 1, 1.2],
                        x: ["-10%", "10%", "-10%"],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Layer 3: Indigo depth */}
                <motion.div
                    className="absolute -inset-[100%] opacity-60"
                    style={{
                        background: "radial-gradient(ellipse 70% 60% at 70% 40%, rgba(99, 102, 241, 0.2), transparent)",
                    }}
                    animate={{
                        scale: [1, 1.1, 1],
                        y: ["-5%", "5%", "-5%"],
                    }}
                    transition={{
                        duration: 18,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />

                {/* Layer 4: Cyan highlight */}
                <motion.div
                    className="absolute -inset-[50%] opacity-30"
                    style={{
                        background: "radial-gradient(ellipse 50% 50% at 60% 30%, rgba(34, 211, 238, 0.15), transparent)",
                    }}
                    animate={{
                        rotate: [0, -15, 0],
                        scale: [1, 1.15, 1],
                    }}
                    transition={{
                        duration: 22,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </div>

            {/* Noise texture overlay for depth */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
