import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface AntiCheatOptions {
  enabled: boolean;
  onViolation: (type: string) => void;
  maxViolations: number;
}

export const useAntiCheat = ({ enabled, onViolation, maxViolations }: AntiCheatOptions) => {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      onViolation('tab-switch');
      toast.warning('Tab switch detected! This violation has been logged.');
    }
  }, [onViolation]);

  const handleBlur = useCallback(() => {
    onViolation('window-blur');
    toast.warning('Window blur detected!');
  }, [onViolation]);

  const handleFullscreenChange = useCallback(() => {
    if (!document.fullscreenElement) {
      onViolation('fullscreen-exit');
      toast.warning('Exited fullscreen mode!');
    }
  }, [onViolation]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    toast.error('Right click is disabled during the exam.');
  }, []);

  const handleCopyPaste = useCallback((e: ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copy/Paste is disabled during the exam.');
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Visibility and Blur
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Restrictions
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('selectstart', (e) => e.preventDefault());

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
    };
  }, [enabled, handleVisibilityChange, handleBlur, handleFullscreenChange, handleContextMenu, handleCopyPaste]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    }
  };

  return { enterFullscreen };
};
