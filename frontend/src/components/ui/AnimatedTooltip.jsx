import React, { useState } from "react";
import {
  motion,
  useTransform,
  useMotionValue,
  useSpring,
  AnimatePresence
} from "framer-motion";

export const AnimatedTooltip = ({
  items,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  
  // Create hooks at the top level to avoid React Hook errors
  const rotateRaw = useTransform(x, [-100, 100], [-45, 45]);
  const translateXRaw = useTransform(x, [-100, 100], [-50, 50]);
  const rotate = useSpring(rotateRaw, springConfig);
  const translateX = useSpring(translateXRaw, springConfig);

  const handleMouseMove = (event) => {
    const halfWidth = event.target.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <AnimatePresence>
        {items.map((item) => (
          <div
            className="relative group cursor-pointer"
            key={item.id}
            onMouseEnter={() => setHoveredIndex(item.id)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 260,
                    damping: 10,
                  },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{
                  translateX: translateX,
                  rotate: rotate,
                  whiteSpace: "nowrap",
                }}
                className="absolute -top-16 -left-1/2 translate-x-1/2 flex flex-col items-center justify-center z-50 rounded-xl bg-black text-white px-4 py-2 shadow-xl"
              >
                <div className="font-bold text-xs">{item.name}</div>
                {item.designation && (
                  <div className="text-[10px] text-white/70">{item.designation}</div>
                )}
                <div className="absolute -bottom-2 w-4 h-4 bg-black rotate-45" />
              </motion.div>
            )}
            <div onMouseMove={handleMouseMove} className="relative z-10">
              {item.element}
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
