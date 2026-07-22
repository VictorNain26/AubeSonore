import { useTrackActions } from '../../hooks/player/useTrackActions';
import { TrackActionsView } from '../../design/organisms/TrackActions';

// Like + partage du morceau courant, regroupés dans la barre d'actions.
export function TrackActions() {
  const { isLiked, isLiking, handleToggleLike, handleShare } = useTrackActions();
  return (
    <TrackActionsView
      isLiked={isLiked}
      isLiking={isLiking}
      onToggleLike={handleToggleLike}
      onShare={handleShare}
    />
  );
}
