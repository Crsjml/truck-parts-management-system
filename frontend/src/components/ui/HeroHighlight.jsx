import React from "react";
import { cn } from "../../utils/cn";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";

export const HeroHighlight = ({
  children,
  className,
  containerClassName,
}) => {
  let mouseX = useMotionValue(0);
  let mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    if (!currentTarget) return;
    let { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-full group overflow-hidden bg-background",
        containerClassName
      )}
      onMouseMove={handleMouseMove}
    >
      {/* Base Grid/Dots */}
      <div className="absolute inset-0 bg-dot-[#00000020] dark:bg-dot-[#ffffff20] pointer-events-none" />
      
      {/* Spotlight Effect that follows the mouse */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100 dark:bg-dot-[#ffffff80] bg-dot-[#00000060]"
        style={{
          WebkitMaskImage: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
          maskImage: useMotionTemplate`
            radial-gradient(
              350px circle at ${mouseX}px ${mouseY}px,
              black 0%,
              transparent 100%
            )
          `,
        }}
      />

      {/* Fade the edges so it doesn't just cut off sharply */}
      <div className="absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />

      <div className={cn("relative z-20 w-full", className)}>{children}</div>
    </div>
  );
};

export const Highlight = ({ children, className }) => {
  return (
    <motion.span
      initial={{ backgroundSize: "0% 100%" }}
      animate={{ backgroundSize: "100% 100%" }}
      transition={{ duration: 1.5, ease: "circOut", delay: 0.2 }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
      }}
      className={cn(
        `relative inline-block px-2 py-1 rounded-xl bg-gradient-to-r from-accent/40 to-accent/20 dark:from-accent/60 dark:to-accent/30 text-foreground`,
        className
      )}
    >
      {children}
    </motion.span>
  );
};
