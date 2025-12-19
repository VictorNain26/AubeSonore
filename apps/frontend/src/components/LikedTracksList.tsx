import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence, useAnimation, AnimationControls } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { useLikedTracks, LikedTrack } from '../hooks/useLikedTracks';

const LikedTracksList: React.FC = () => {
  const { likedTracks, isLoading, isError, handleDelete } = useLikedTracks();
  const controls: AnimationControls = useAnimation();
  const [ref, inView] = useInView({ threshold: 0.2, triggerOnce: true });

  useEffect(() => {
    if (inView) {
      controls.start({ opacity: 1, y: 0 });
    }
  }, [inView, controls]);

  const handleDeleteClick = async (id: string): Promise<void> => {
    if (!id) {
      return;
    }

    // eslint-disable-next-line no-alert
    const confirmation = window.confirm('Voulez-vous vraiment supprimer ce morceau ?');
    if (!confirmation) {
      return;
    }

    try {
      await handleDelete(id);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error('[handleDeleteClick]', err);
    }
  };

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.92 },
  };

  const renderHeader = (): React.ReactElement => (
    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
      💖 Morceaux likés
      <AnimatePresence mode="wait">
        <motion.span
          key={likedTracks.length}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="bg-blue-100 text-blue-700 text-sm font-semibold px-2 py-0.5 rounded-full"
        >
          {likedTracks.length}
        </motion.span>
      </AnimatePresence>
    </h2>
  );

  const renderTrackItem = (track: LikedTrack): React.ReactElement => (
    <motion.li
      key={track.id}
      variants={itemVariants}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      layout
      exit="exit"
      className={
        'flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-gray-100 rounded shadow'
      }
    >
      {track.artwork ? (
        <img
          src={track.artwork}
          alt={`${track.artist} - ${track.title}`}
          className="w-24 h-24 object-cover rounded"
        />
      ) : null}
      <div className="flex-1 w-full min-w-0">
        <p className="font-semibold break-words">{track.artist} - {track.title}</p>
        {track.youtubeUrl ? (
          <a
            href={track.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline text-sm"
          >
            Voir sur YouTube
          </a>
        ) : null}
      </div>
      <Button
        onClick={() => handleDeleteClick(track.id)}
        className={
          'w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm self-start'
        }
      >
        Supprimer
      </Button>
    </motion.li>
  );

  const renderContent = (): React.ReactElement => {
    if (isLoading) {
      return <p className="text-gray-500">Chargement des morceaux...</p>;
    }

    if (isError) {
      return <p className="text-red-500">Erreur lors du chargement des morceaux.</p>;
    }

    if (likedTracks.length === 0) {
      return <p className="text-gray-500">Aucun morceau liké pour le moment.</p>;
    }

    return (
      <AnimatePresence>
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="space-y-4"
        >
          {likedTracks.map(renderTrackItem)}
        </motion.ul>
      </AnimatePresence>
    );
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={controls}
      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.5 }}
      className="mt-8 max-w-3xl mx-auto px-4"
    >
      {renderHeader()}
      {renderContent()}
    </motion.div>
  );
};

export default LikedTracksList;
