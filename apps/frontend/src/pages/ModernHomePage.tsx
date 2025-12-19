import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Radio, TrendingUp, Clock, Users, Music2 } from 'lucide-react';
import MusicPlayer from '../components/MusicPlayer';
import SidePanel from '../components/SidePanel';
import { Button } from '../components/ui/button';
import { useAuth } from '../hooks/useAuth';

const StatsCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  description: string;
  delay: number;
}> = ({ icon: Icon, title, value, description, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="glass rounded-2xl p-6 hover:neon-glow transition-all duration-300 cursor-pointer group"
  >
    <div className="flex items-center gap-4">
      <div className={
        'w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center ' +
        'group-hover:scale-110 transition-transform'
      }>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  </motion.div>
);

const QuickAction: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
  delay: number;
}> = ({ icon: Icon, title, description, onClick, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
  >
    <Button
      variant="glass"
      onClick={onClick}
      className="w-full h-auto p-6 flex flex-col items-center gap-3 hover:scale-105 transition-all duration-300"
    >
      <Icon className="w-8 h-8 text-accent" />
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60 mt-1">{description}</p>
      </div>
    </Button>
  </motion.div>
);

const ModernHomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [isPanelOpen, setPanelOpen] = useState<boolean>(false);

  const handlePanelOpen = (): void => setPanelOpen(true);
  const handlePanelClose = (): void => setPanelOpen(false);

  const stats = [
    {
      icon: Users,
      title: 'Auditeurs',
      value: '1,247',
      description: 'En ligne maintenant',
    },
    {
      icon: Music2,
      title: 'Tracks',
      value: '12,543',
      description: 'Dans la bibliothèque',
    },
    {
      icon: TrendingUp,
      title: 'Tendance',
      value: '+23%',
      description: 'Cette semaine',
    },
    {
      icon: Clock,
      title: 'Temps d\'écoute',
      value: '24/7',
      description: 'Non-stop radio',
    },
  ];

  const quickActions = [
    {
      icon: Heart,
      title: 'Mes Favoris',
      description: 'Voir vos tracks préférés',
      onClick: handlePanelOpen,
    },
    {
      icon: Radio,
      title: 'Radio Live',
      description: 'Écouter en direct',
      onClick: (): void => {},
    },
    {
      icon: TrendingUp,
      title: 'Découvrir',
      description: 'Nouveautés et tendances',
      onClick: (): void => {},
    },
  ];

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />

        <div className="relative z-10 container mx-auto px-4 py-12 lg:py-20">
          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4">
              {isAuthenticated ? (
                <>
                  Salut {user?.name?.split(' ')[0] ?? 'Mélomane'} 👋
                </>
              ) : (
                <>
                  Bienvenue sur{' '}
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    OurMusic
                  </span>
                </>
              )}
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              {isAuthenticated ? (
                'Prêt pour une nouvelle session d\'écoute ?'
              ) : (
                'Votre webradio collaborative. Découvrez, partagez et vibrez avec la musique.'
              )}
            </p>
          </motion.div>

          {/* Music Player */}
          <div className="mb-16">
            <MusicPlayer />
          </div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          >
            {stats.map((stat, index) => (
              <StatsCard
                key={stat.title}
                icon={stat.icon}
                title={stat.title}
                value={stat.value}
                description={stat.description}
                delay={0.4 + index * 0.1}
              />
            ))}
          </motion.div>

          {/* Quick Actions */}
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-white text-center">
                Actions Rapides
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {quickActions.map((action, index) => (
                  <QuickAction
                    key={action.title}
                    icon={action.icon}
                    title={action.title}
                    description={action.description}
                    onClick={action.onClick}
                    delay={0.9 + index * 0.1}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA for non-authenticated users */}
          {!isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-center mt-16"
            >
              <div className="glass rounded-3xl p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Rejoignez la communauté
                </h2>
                <p className="text-white/70 mb-6">
                  Créez votre compte pour sauvegarder vos favoris,
                  découvrir de nouvelles musiques et bien plus encore.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="gradient" size="lg" className="px-8">
                    S'inscrire gratuitement
                  </Button>
                  <Button variant="outline" size="lg" className="px-8">
                    Se connecter
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: { duration: 50, repeat: Infinity, ease: 'linear' },
              scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute top-1/4 right-1/4 w-32 h-32 border border-primary/20 rounded-full"
          />
          <motion.div
            animate={{
              rotate: -360,
              scale: [1, 0.9, 1],
            }}
            transition={{
              rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
              scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
            }}
            className="absolute bottom-1/4 left-1/4 w-24 h-24 border border-accent/20 rounded-full"
          />
        </div>
      </section>

      {/* Side Panel */}
      <SidePanel isOpen={isPanelOpen} onClose={handlePanelClose} />

      {/* Fixed Action Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
        className="fixed bottom-6 right-6 z-30"
      >
        <Button
          variant="gradient"
          size="lg"
          onClick={handlePanelOpen}
          className="rounded-full shadow-2xl hover:scale-110 transition-transform neon-glow"
        >
          <Heart className="w-5 h-5 mr-2" />
          Favoris
        </Button>
      </motion.div>
    </div>
  );
};

export default ModernHomePage;
