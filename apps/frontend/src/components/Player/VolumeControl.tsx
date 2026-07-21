import { useEffect, useRef, useState } from 'react';
import { VolumeControlView } from '../../design/molecules/VolumeControl';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
}

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.matchMedia('(hover: none)').matches);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setIsHovering(true);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    setIsHovering(false);
    closeTimeoutRef.current = window.setTimeout(() => setIsOpen(false), 300);
  };

  useEffect(() => {
    if (!isOpen || !isMobile) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isMobile]);

  const handleIconClick = () => {
    if (isMobile) {
      setIsOpen((prev) => !prev);
    } else {
      onToggleMute();
    }
  };

  const isExpanded = isOpen || (!isMobile && isHovering);

  return (
    <VolumeControlView
      volume={volume}
      isMuted={isMuted}
      onVolumeChange={onVolumeChange}
      isExpanded={isExpanded}
      containerRef={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onIconClick={handleIconClick}
    />
  );
}
