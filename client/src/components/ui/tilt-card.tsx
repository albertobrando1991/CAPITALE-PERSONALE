import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    glareEnabled?: boolean;
    tiltAmount?: number;
}

export function TiltCard({
    children,
    className,
    glareEnabled = true,
    tiltAmount = 15
}: TiltCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const xSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const ySpring = useSpring(y, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(ySpring, [-0.5, 0.5], [tiltAmount, -tiltAmount]);
    const rotateY = useTransform(xSpring, [-0.5, 0.5], [-tiltAmount, tiltAmount]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        x.set((mouseX / width) - 0.5);
        y.set((mouseY / height) - 0.5);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        setIsHovered(false);
    };

    return (
        <motion.div
            ref={ref}
            className={cn(
                "relative transform-gpu",
                className
            )}
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {/* Glare effect */}
            {glareEnabled && (
                <motion.div
                    className="absolute inset-0 pointer-events-none rounded-inherit overflow-hidden"
                    style={{
                        background: useTransform(
                            [xSpring, ySpring],
                            ([latestX, latestY]) => {
                                const xPercent = ((latestX as number) + 0.5) * 100;
                                const yPercent = ((latestY as number) + 0.5) * 100;
                                return `radial-gradient(circle at ${xPercent}% ${yPercent}%, rgba(255,255,255,0.15), transparent 60%)`;
                            }
                        ),
                        opacity: isHovered ? 1 : 0,
                        transition: "opacity 0.3s",
                    }}
                />
            )}
        </motion.div>
    );
}

interface GlassmorphicCardProps {
    children: React.ReactNode;
    className?: string;
}

export function GlassmorphicCard({ children, className }: GlassmorphicCardProps) {
    return (
        <div
            className={cn(
                "relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl",
                "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/20 before:to-transparent before:pointer-events-none",
                className
            )}
        >
            <div className="relative z-10">{children}</div>
        </div>
    );
}
