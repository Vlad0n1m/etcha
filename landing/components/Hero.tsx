import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import HeroGraphic from './HeroGraphic';
import { Sparkles, ArrowRight, Zap, Globe2 } from 'lucide-react';

const Hero: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className="relative w-full md:h-screen min-h-screen flex flex-col md:overflow-hidden bg-etcha-bg">
      
      {/* Interactive Background Spotlight */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 opacity-30"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(153, 69, 255, 0.12), transparent 40%)`
        }}
      />
      
      {/* Grid Overlay for Tech feel */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0 pointer-events-none mix-blend-overlay"></div>
      
      {/* Content Container */}
      <div className="container mx-auto px-6 md:px-12 flex-1 flex flex-col md:flex-row items-center justify-center relative z-10 pt-24 md:pt-0">
        
        {/* Left Column: Text */}
        <div className="w-full md:w-1/2 flex flex-col justify-center items-start mt-10 md:mt-0 mb-14 md:mb-0">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#14F195]/10 border border-[#14F195]/20 backdrop-blur-md"
          >
            <Zap size={12} className="text-[#14F195] fill-[#14F195]" />
            <span className="text-[11px] font-semibold text-[#14F195] tracking-widest uppercase">Powered by Solana</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tighter text-white mb-6"
          >
            Global events.<br/>
            Crypto native.<br/>
            <span className="bg-clip-text text-transparent bg-solana-text">
              Limitless.
            </span>
          </motion.h1>
          
          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="text-lg text-gray-400 max-w-lg leading-relaxed mb-10 font-light"
          >
            Создавайте события, покупайте и перепродавайте билеты из любой точки мира за <span className="text-white font-medium">SOL</span> или <span className="text-white font-medium">USDC</span>. Мгновенные переводы, никакой бюрократии и полная прозрачность.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button className="group relative bg-white text-black font-bold text-lg px-8 py-4 rounded-full overflow-hidden transition-all duration-300 hover:bg-[#14F195] hover:shadow-[0_0_30px_rgba(20,241,149,0.4)]">
              <span className="relative z-10 flex items-center gap-2">
                Launch App <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            
            <button className="px-8 py-4 rounded-full font-medium text-white border border-white/10 hover:bg-white/5 hover:border-[#9945FF]/50 transition-colors backdrop-blur-sm flex items-center gap-2">
               <Globe2 size={18} className="text-[#9945FF]" /> Explore Events
            </button>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="mt-12 flex items-center gap-6 text-xs text-gray-500 font-mono"
          >
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#14F195]"></div>
                <span>Network Operational</span>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#9945FF]"></div>
                <span>0.00025 SOL Avg Fee</span>
             </div>
          </motion.div>
        </div>

        {/* Right Column: Visuals */}
        <div className="w-full md:w-1/2 h-[550px] md:h-full flex items-center justify-center relative">
          <HeroGraphic />
        </div>
      </div>
    </section>
  );
};

export default Hero;