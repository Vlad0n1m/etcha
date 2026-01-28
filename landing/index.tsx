
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, 
  Globe, 
  Ticket, 
  ArrowRight, 
  Zap, 
  Globe2, 
  RefreshCw, 
  QrCode, 
  TrendingUp, 
  ShieldCheck, 
  ArrowUpRight,
  Twitter, 
  Instagram, 
  Dribbble, 
  Mail 
} from 'lucide-react';

// --- Types ---

interface FloatingElementProps {
  delay?: number;
  x?: number;
  y?: number;
  children: React.ReactNode;
  className?: string;
}

// --- Components ---

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 bg-gradient-to-b from-black via-black/80 to-transparent backdrop-blur-[2px]">
      {/* Logo */}
      <div className="flex items-center gap-2 group cursor-pointer">
         <div className="relative w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 group-hover:border-[#14F195]/50 transition-colors">
            <Ticket size={18} className="text-[#14F195] group-hover:rotate-12 transition-transform duration-500" />
         </div>
         <span className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-1">
            etcha<span className="text-[#9945FF]">.io</span>
         </span>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
        <a href="#" className="hidden md:flex items-center hover:text-white transition-colors gap-2">
          <Globe size={14} /> Global Events
        </a>
        <a href="#" className="hidden md:flex items-center hover:text-white transition-colors">
          Marketplace
        </a>
        <button className="bg-white text-black font-bold px-5 py-2.5 rounded-full transition-all duration-300 hover:bg-[#14F195] hover:shadow-[0_0_20px_rgba(20,241,149,0.4)] flex items-center gap-2">
          <Wallet size={16} /> Connect Wallet
        </button>
      </div>
    </nav>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="w-full py-6 px-6 md:px-12 md:absolute md:bottom-0 md:left-0 md:right-0 z-40 border-t border-white/5 md:border-none backdrop-blur-sm md:backdrop-blur-none bg-[#050505]/80 md:bg-transparent">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
        
        <div className="flex items-center gap-6">
          <span className="font-display font-bold tracking-tight text-gray-300">
            etcha © 2024
          </span>
          <div className="hidden md:flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Правила</a>
            <a href="#" className="hover:text-white transition-colors">Приватность</a>
          </div>
        </div>

        <div className="flex gap-6">
            <a href="#" className="hover:text-purple-400 transition-colors"><Mail size={16} /></a>
            <a href="#" className="hover:text-pink-400 transition-colors"><Dribbble size={16} /></a>
            <a href="#" className="hover:text-blue-400 transition-colors"><Twitter size={16} /></a>
            <a href="#" className="hover:text-orange-400 transition-colors"><Instagram size={16} /></a>
        </div>
      </div>
    </footer>
  );
};

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

const HeroGraphic: React.FC = () => {
  return (
    <div className="relative w-full h-[550px] md:h-[100%] max-h-[800px] flex items-center justify-center perspective-1000">
      
      {/* Solana Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-[#9945FF]/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] md:w-[350px] md:h-[350px] bg-[#14F195]/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen animate-pulse" />

      {/* Main Phone Container */}
      <motion.div 
        initial={{ rotateY: 20, rotateX: 10, y: 100, opacity: 0 }}
        animate={{ rotateY: -12, rotateX: 5, y: 0, opacity: 1 }}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[300px] md:w-[340px] aspect-[9/19.5] bg-[#0A0A0A] rounded-[48px] border-[4px] border-[#222] shadow-[0_50px_100px_-20px_rgba(20,241,149,0.15)] overflow-hidden"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Screen Shine */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none z-30 rounded-[44px]"></div>

        {/* Dynamic Island Area */}
        <div className="absolute top-0 left-0 right-0 h-10 z-30 flex justify-center items-start pt-3">
             <div className="w-28 h-7 bg-black rounded-full flex items-center justify-between px-3 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[#14F195] animate-pulse shadow-[0_0_8px_#14F195]"></div>
                <span className="text-[10px] text-gray-400 font-mono">SOL Mainnet</span>
             </div>
        </div>
        
        {/* Phone Content - Crypto Wallet Style */}
        <div className="flex flex-col h-full bg-[#0A0A0A] text-white pt-14 pb-8 relative">
          
          {/* Header: Wallet Balance */}
          <div className="px-6 mb-6 flex justify-between items-center">
            <div>
                <p className="text-xs text-gray-500 mb-1 font-mono">Total Balance</p>
                <h3 className="text-2xl font-bold font-display flex items-baseline gap-1">
                    142.5 <span className="text-sm text-[#9945FF]">SOL</span>
                </h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#9945FF] to-[#14F195] p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <Wallet size={18} className="text-white" />
                </div>
            </div>
          </div>

          {/* Ticket NFT Card */}
          <div className="px-4 mb-4">
             <div className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
                {/* Image */}
                <img 
                   src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=800&auto=format&fit=crop" 
                   alt="Event" 
                   className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                {/* NFT Details Overlay */}
                <div className="absolute top-4 right-4">
                    <div className="bg-black/60 backdrop-blur-md border border-[#14F195]/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#14F195]"></div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#14F195]">Verified</span>
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-5">
                   <h2 className="text-2xl font-display font-bold leading-tight text-white mb-2">
                      Solana Breakpoint <br/> <span className="text-gray-400">Official Afterparty</span>
                   </h2>
                   
                   <div className="flex justify-between items-end mt-4">
                       <div>
                           <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Current Floor</p>
                           <p className="text-lg font-bold text-[#14F195]">2.45 SOL</p>
                       </div>
                       <div className="h-10 w-10 bg-white text-black rounded-xl flex items-center justify-center">
                           <QrCode size={20} />
                       </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Resell Actions */}
          <div className="px-6 flex-1 flex flex-col justify-end space-y-3">
             <div className="flex items-center justify-between text-sm text-gray-400 px-1">
                <span>Holdings: 1 Ticket</span>
                <span className="text-[#14F195] flex items-center gap-1"><TrendingUp size={12}/> +12% value</span>
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <button className="bg-[#1a1a1a] border border-white/10 hover:bg-[#222] text-white py-3.5 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2">
                    <RefreshCw size={16} className="text-[#9945FF]" />
                    Resell
                </button>
                <button className="bg-white text-black py-3.5 rounded-xl font-bold text-sm hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all flex items-center justify-center gap-2">
                    Transfer <ArrowUpRight size={16} />
                </button>
             </div>
          </div>

        </div>
      </motion.div>

      {/* Floating Crypto Elements */}
      
      {/* Solana Floating Logo Representation */}
      <FloatingElement delay={0} y={20} className="absolute top-[20%] right-[-10%] md:right-[0%] z-20">
         <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-[#1A1A1A] to-black border border-[#9945FF]/30 backdrop-blur-xl flex items-center justify-center shadow-[0_0_30px_rgba(153,69,255,0.2)]">
            <div className="text-[#9945FF] font-bold text-xs tracking-widest">SOL</div>
         </div>
      </FloatingElement>

      {/* Security Badge */}
      <FloatingElement delay={2} y={-15} className="absolute bottom-[20%] left-[-5%] md:left-[5%] z-20">
         <div className="glass-panel px-4 py-2 rounded-full flex items-center gap-2 shadow-xl border-l-4 border-l-[#14F195]">
             <ShieldCheck className="text-[#14F195]" size={16} />
             <span className="text-xs font-bold text-white">Smart Contract Verified</span>
         </div>
      </FloatingElement>
      
      {/* Sold Out Badge */}
      <FloatingElement delay={1} y={10} className="absolute top-[10%] left-[0%] md:left-[10%] z-20">
         <div className="bg-[#FF3B30] text-white font-bold text-[10px] py-1.5 px-3 rounded-md -rotate-12 shadow-lg shadow-red-900/40 uppercase tracking-widest border border-white/20">
            Sold Out
         </div>
      </FloatingElement>

    </div>
  );
};

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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#9945FF] to-[#14F195]">
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

// --- App Entry Point ---

export default function App() {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-[#9945FF]/30 overflow-hidden">
      <Navbar />
      <main className="w-full">
        <Hero />
      </main>
      <Footer />
    </div>
  );
}
