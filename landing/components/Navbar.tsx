import React from 'react';
import { Wallet, Globe, Ticket } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12 bg-gradient-to-b from-black via-black/80 to-transparent backdrop-blur-[2px]">
      {/* Logo */}
      <div className="flex items-center gap-2 group cursor-pointer">
         <div className="relative w-8 h-8 flex items-center justify-center bg-white/5 rounded-lg border border-white/10 group-hover:border-etcha-green/50 transition-colors">
            <Ticket size={18} className="text-etcha-green group-hover:rotate-12 transition-transform duration-500" />
         </div>
         <span className="text-xl font-display font-bold tracking-tight text-white flex items-center gap-1">
            etcha<span className="text-etcha-accent">.io</span>
         </span>
      </div>

      <div className="flex items-center gap-6 text-sm font-medium text-gray-400">
        <a href="#" className="hidden md:flex items-center hover:text-white transition-colors gap-2">
          <Globe size={14} /> Global Events
        </a>
        <a href="#" className="hidden md:flex items-center hover:text-white transition-colors">
          Marketplace
        </a>
        <button className="bg-white text-black font-bold px-5 py-2.5 rounded-full transition-all duration-300 hover:bg-etcha-green hover:shadow-[0_0_20px_rgba(20,241,149,0.4)] flex items-center gap-2">
          <Wallet size={16} /> Connect Wallet
        </button>
      </div>
    </nav>
  );
};

export default Navbar;