import React from 'react';
import { motion } from 'framer-motion';
import { FloatingElementProps } from '../types';

const FloatingElement: React.FC<FloatingElementProps> = ({ delay = 0, x = 0, y = 10, children, className }) => {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -y, 0],
        x: [0, x, 0],
      }}
      transition={{
        duration: 4,
        delay: delay,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
};

export default FloatingElement;