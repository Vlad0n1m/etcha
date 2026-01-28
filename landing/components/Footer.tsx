import React from 'react';
import { Twitter, Instagram, Dribbble, Mail } from 'lucide-react';

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

export default Footer;