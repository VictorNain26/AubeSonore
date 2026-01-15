import React from 'react';
import { motion } from 'framer-motion';
import MusicPlayer from '../components/MusicPlayer';

const ModernHomePage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 px-4"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          <span className="bg-gradient-to-r from-primary via-accent to-pink-400 bg-clip-text text-transparent">
            Webradio Collaborative
          </span>
        </h1>
        <p className="text-white/50 text-sm md:text-base max-w-md mx-auto">
          Musique non-stop 24/7 avec les derniers morceaux tendance
        </p>
      </motion.div>

      {/* Music Player */}
      <MusicPlayer />

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-12 text-center px-4"
      >
        <div className="flex items-center justify-center gap-6 text-white/30 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span>En ligne</span>
          </div>
          <span>|</span>
          <span>Streaming HQ</span>
          <span>|</span>
          <span>24/7</span>
        </div>
      </motion.div>

      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-2]">
        {/* Animated circles */}
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 60,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] border border-white/[0.03] rounded-full"
        />
        <motion.div
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 80,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] border border-white/[0.02] rounded-full"
        />
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 100,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/[0.02] rounded-full"
        />
      </div>
    </div>
  );
};

export default ModernHomePage;
