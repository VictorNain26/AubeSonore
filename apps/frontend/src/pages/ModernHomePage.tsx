import React from 'react';
import MusicPlayer from '../components/MusicPlayer';

const ModernHomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4">
      {/* Main Player */}
      <MusicPlayer />
    </div>
  );
};

export default ModernHomePage;
