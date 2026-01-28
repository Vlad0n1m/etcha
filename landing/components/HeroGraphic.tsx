import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, QrCode, TrendingUp, ShieldCheck, Wallet, ArrowUpRight } from 'lucide-react';
import FloatingElement from './FloatingElement';

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

export default HeroGraphic;