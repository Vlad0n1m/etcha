import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Footer from './components/Footer';

const App: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-etcha-bg text-white font-sans selection:bg-purple-500/30 overflow-hidden">
      <Navbar />
      <main className="w-full">
        <Hero />
      </main>
      <Footer />
    </div>
  );
};

export default App;