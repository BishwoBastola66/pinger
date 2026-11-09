'use client';

import { useEffect } from 'react';

export function AntiZoom() {
  useEffect(() => {
    // 1. Block Ctrl + Mouse Wheel & Trackpad Pinch-to-Zoom (must be non-passive)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // 2. Block Keyboard Zoom: Ctrl + Plus, Ctrl + Minus, Ctrl + Zero
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const zoomKeys = [
          '+', '-', '=', '_', '0',
          'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract', 'Digit0', 'Numpad0'
        ];
        if (zoomKeys.includes(e.key) || zoomKeys.includes(e.code)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // 3. Block Multi-touch Pinch on touchscreens / mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // 4. Block Double-Tap Zoom
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // 5. Block Safari gesture zoom
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    // Register with passive: false to allow preventDefault()
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', handleGesture as any, { passive: false });
    document.addEventListener('gesturechange', handleGesture as any, { passive: false });
    document.addEventListener('gestureend', handleGesture as any, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', handleGesture as any);
      document.removeEventListener('gesturechange', handleGesture as any);
      document.removeEventListener('gestureend', handleGesture as any);
    };
  }, []);

  return null;
}
