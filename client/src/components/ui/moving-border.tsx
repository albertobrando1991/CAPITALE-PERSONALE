import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MovingBorderButtonProps {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    borderRadius?: string;
    duration?: number;
    borderColor?: string;
    onClick?: () => void;
}

export function MovingBorderButton({
    children,
    className,
    containerClassName,
    borderRadius = "1rem",
    duration = 3,
    borderColor = "rgba(245, 158, 11, 0.8)",
    onClick,
}: MovingBorderButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative p-[2px] overflow-hidden group",
                containerClassName
            )}
            style={{ borderRadius }}
        >
            {/* Moving gradient border */}
            <motion.div
                className="absolute inset-0"
                style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, ${borderColor} 60deg, transparent 120deg)`,
                    borderRadius,
                }}
                animate={{
                    rotate: 360,
                }}
                transition={{
                    duration,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Inner static glow */}
            <div
                className="absolute inset-[1px] opacity-30"
                style={{
                    background: `radial-gradient(circle at center, ${borderColor}, transparent 70%)`,
                    borderRadius: `calc(${borderRadius} - 1px)`,
                }}
            />

            {/* Content container */}
            <div
                className={cn(
                    "relative bg-slate-950 px-6 py-3 font-semibold text-white transition-all",
                    "group-hover:bg-slate-900",
                    className
                )}
                style={{ borderRadius: `calc(${borderRadius} - 2px)` }}
            >
                {children}
            </div>
        </button>
    );
}

interface GlowingBorderCardProps {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

export function GlowingBorderCard({
    children,
    className,
    glowColor = "rgba(99, 102, 241, 0.5)",
}: GlowingBorderCardProps) {
    return (
        <div
            className={cn(
                "relative rounded-2xl p-[1px]",
                "before:absolute before:inset-0 before:rounded-2xl before:p-[1px]",
                "before:bg-gradient-to-r before:from-transparent before:via-indigo-500/50 before:to-transparent",
                "before:animate-shimmer",
                className
            )}
            style={{
                background: `linear-gradient(135deg, ${glowColor} 0%, transparent 50%, ${glowColor} 100%)`,
            }}
        >
            <div className="relative bg-slate-950 rounded-2xl h-full">
                {children}
            </div>
        </div>
    );
}
