import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// --- GLOBAL SCROLL LOCK (iOS PWA safe, no fixed-body) ---
const _locks = new Set<symbol>();
let _restore: null | (() => void) = null;

function _applyLock() {
  const html = document.documentElement;
  const body = document.body;

  const prevHtmlOverflow = html.style.overflow;
  const prevBodyOverflow = body.style.overflow;

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";

  // iOS: stop background scroll/rubberband, but allow modal interactions
  const ac = new AbortController();

  let startY = 0;

  const onTouchStart = (e: TouchEvent) => {
    startY = e.touches[0]?.clientY ?? 0;
  };

  const onTouchMove = (e: TouchEvent) => {
    const target = e.target as Element | null;

    const sheet = target?.closest?.(".modal-content") as HTMLElement | null;
    if (!sheet) {
      // Touches outside the sheet (overlay bg) should not scroll the page
      e.preventDefault();
      return;
    }

    const scroller = target?.closest?.(".modal-body") as HTMLElement | null;
    if (!scroller) {
      // Header/grabber area: allow (needed for swipe-down close)
      return;
    }

    // Inside modal-body: prevent scroll-chaining / rubberband leaking to page
    const currentY = e.touches[0]?.clientY ?? 0;
    const dy = currentY - startY;

    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;

    if ((atTop && dy > 0) || (atBottom && dy < 0)) {
      e.preventDefault();
    }
  };

  document.addEventListener("touchstart", onTouchStart, { passive: true, signal: ac.signal });
  document.addEventListener("touchmove", onTouchMove, { passive: false, signal: ac.signal });

  _restore = () => {
    ac.abort();
    html.style.overflow = prevHtmlOverflow;
    body.style.overflow = prevBodyOverflow;
  };
}

function lockScroll(token: symbol) {
  if (_locks.has(token)) return;
  _locks.add(token);
  if (_locks.size === 1) _applyLock();
}

function unlockScroll(token: symbol) {
  if (!_locks.delete(token)) return;
  if (_locks.size === 0) {
    _restore?.();
    _restore = null;
  }
}

// --- CSS ---
const STYLES = `
:root{
  --fg:#ffffff;--muted:#8e8e93;--line:rgba(255,255,255,0.1);
  --bg:#000000; 
  --card:#1c1c1e; 
  --hint:#2c2c2e;
  --accent:#0a84ff;--danger:#ff453a;--success:#30d158;--warning:#ffd60a;--orange:#ff9f0a;
  --input-bg:rgba(255,255,255,0.1);
  --pill-bg: #2c2c2e;
  --stepper-bg: #2c2c2e;
  --shadow:0 8px 24px rgba(0,0,0,0.4);
  --top-mask: rgba(0, 0, 0, 0.8);
  --chart-grid: rgba(255,255,255,0.08);
}
@media (prefers-color-scheme: light){
  :root{
    --fg:#0b0b0b;--muted:#6a6a6a;--line:rgba(0,0,0,0.08);--bg:#f2f2f7;--card:#ffffff;--hint:#f7f7f7;
    --accent:#007aff;--danger:#ff3b30;--success:#34c759;--warning:#ffcc00;--orange:#ff9500;
    --input-bg:rgba(0,0,0,0.04);
    --pill-bg: #e5e5ea;
    --stepper-bg: #e5e5ea;
    --shadow:0 8px 24px rgba(0,0,0,0.06);
    --top-mask: rgba(242, 242, 247, 0.85);
    --chart-grid: rgba(0,0,0,0.06);
  }
}

html,body{
  background:var(--bg);
  color:var(--fg);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  margin:0; padding:0;
  min-height: 100%;
}

body{
  max-width:800px;
  margin:0 auto;
  overflow-x:hidden;
}

h1{font-size:1.6rem;margin:0;font-weight:700;letter-spacing:-0.5px;} 
h2{font-size:1.2rem;margin:0;font-weight:600} 
h3{margin:0 0 8px;font-size:1rem;font-weight:600;opacity:0.9} 
h4{margin:0 0 8px;font-size:0.95rem}
.small{font-size:.85rem;color:var(--muted)}
.muted{color:var(--muted)}

/* Status Bar Blur - Subtle */
.statusbar-blur {
  position: fixed; top: 0; left: 0; right: 0;
  height: calc(env(safe-area-inset-top) + 24px);
  pointer-events: none;
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  background: linear-gradient(to bottom, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.16) 30%, rgba(0,0,0,0.10) 65%, rgba(0,0,0,0.04) 100%);
  mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
  z-index: 2900;
}
@media (prefers-color-scheme: light) {
  .statusbar-blur { 
    background: linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 30%, rgba(255,255,255,0.1) 65%, rgba(255,255,255,0.05) 100%); 
  }
}

/* Liquid Glass Effect */
.glass {
  background: rgba(245, 245, 247, 0.65);
  backdrop-filter: blur(25px) saturate(180%);
  -webkit-backdrop-filter: blur(6px) saturate(170%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
}
@media (prefers-color-scheme: dark) {
  .glass { 
    background: rgba(22, 22, 24, 0.25); 
    backdrop-filter: blur(35px) saturate(180%);
    -webkit-backdrop-filter: blur(4px) saturate(170%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6); 
  }
}

/* Floating Controls */
.floating-dock-left, .floating-dock-right {
  position: fixed; z-index: 2000; display: flex; gap: 6px;
}
.floating-dock-left { bottom: 16px; left: 36px; }
.floating-dock-right { bottom: 16px; right: 24px; }
@supports (bottom: max(0px, env(safe-area-inset-bottom))) {
  .floating-dock-left { bottom: max(16px, calc(env(safe-area-inset-bottom) - 8px)); }
  .floating-dock-right { bottom: max(16px, calc(env(safe-area-inset-bottom) - 8px)); }
}
@media (max-width: 450px) {
  .floating-dock-left { left: 20px; }
  .floating-dock-right { right: 20px; }
}

.nav-container {
  position: relative; display: flex; padding: 5px; border-radius: 32px; width: 200px; height: 50px; box-sizing: border-box;
}
.nav-bg {
  position: absolute; top: 5px; bottom: 5px; left: 5px; width: calc(50% - 5px); background: var(--fg); border-radius: 26px; transition: transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1); z-index: 1;
}
.nav-btn {
  flex: 1; border: none; background: transparent; z-index: 2; font-weight: 600; font-size: 0.95rem; color: var(--muted); cursor: pointer; transition: color 0.2s; text-align: center; border-radius: 26px;
}
.nav-btn.active { color: var(--bg); }

.diff-pill {
  position: relative;
  z-index: 1;
  height: 50px; 
  min-width: 90px; 
  padding: 0 20px; 
  border-radius: 32px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 700; 
  font-size: 0.95rem; 
  cursor: default; 
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
  transition: transform 0.2s, opacity 0.2s, background-color 0.3s, color 0.3s, width 0.3s ease-out, padding 0.3s ease-out;
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}

.diff-pill.ok { 
  background: 
    linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.1) 100%),
    rgba(52, 199, 89, 0.92);  /* 92% opaque - slight transparency */
  color: white; 
  box-shadow: 
    0 8px 32px rgba(52, 199, 89, 0.4),
    0 0 0 1px rgba(255,255,255,0.2) inset,
    0 1px 0 rgba(255,255,255,0.3) inset;
}

.diff-pill.bad { 
  background: 
    linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.15) 100%),
    rgba(255, 69, 58, 0.92);  /* 92% opaque */
  color: white; 
  box-shadow: 
    0 8px 32px rgba(255, 69, 58, 0.4),
    0 0 0 1px rgba(255,255,255,0.15) inset,
    0 1px 0 rgba(255,255,255,0.25) inset;
}

/* Morphing FAB */
.morphing-fab-container {
  position: fixed;
  bottom: 16px;
  right: 24px;
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 50px;
  pointer-events: none;
}
@supports (bottom: max(0px, env(safe-area-inset-bottom))) {
  .morphing-fab-container { bottom: max(16px, calc(env(safe-area-inset-bottom) - 8px)); }
}

/* Blur backgrounds - NEVER animated with transform, only opacity */
.morph-blur-layer {
  position: absolute;
  right: 0;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(245, 245, 247, 0.65);
  -webkit-backdrop-filter: blur(6px) saturate(170%);
  backdrop-filter: blur(6px) saturate(170%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  /* Only fade opacity - NO transform animation */
  transition: opacity 0.4s ease-out;
  pointer-events: none;
  transition: 
    opacity 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}


@media (prefers-color-scheme: dark) {
  .morph-blur-layer {
    background: rgba(22, 22, 24, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }
}
.morph-blur-layer.visible { opacity: 1; }
.morph-blur-layer.hidden { opacity: 0; }

/* Content layers - these CAN animate with transform */
.morph-layer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  transform-origin: center right;
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  
  /* iOS 26 bouncy spring - slightly longer with more overshoot */
  transition:
    opacity 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.morph-layer.visible {
  animation: morphPop 0.4s cubic-bezier(0.34, 1, 0.64, 1);
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
  z-index: 2;
}
.morph-layer.hidden {
  opacity: 0;
  /* More dramatic exit - slides further and shrinks more */
  transform: scale(0.9);
  pointer-events: none;
  z-index: 1;
}

/* Search FAB - NO blur here, blur is on separate layer */
.floating-search-button {
  width: 50px; height: 50px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--fg);
  background: transparent;
  border: none;
  box-shadow: none;
  transition: transform 0.2s;
}
.floating-search-button:active { transform: scale(0.92); }


/* Common UI */
.card{
  border-radius:24px;
  padding:20px;
  margin:16px 0;
  background:var(--card);
  /* Strong layered shadows for dark mode */
  box-shadow:
    0 2px 4px rgba(0,0,0,0.2),
    0 4px 8px rgba(0,0,0,0.15),
    0 8px 16px rgba(0,0,0,0.1),
    0 16px 32px rgba(0,0,0,0.08);
}
/* Light mode - subtle card shadows */
@media (prefers-color-scheme: light) {
  .card {
    box-shadow:
      0 1px 1px rgba(0,0,0,0.04),
      0 2px 4px rgba(0,0,0,0.04),
      0 4px 8px rgba(0,0,0,0.06),
      0 8px 16px rgba(0,0,0,0.06);
  }
}
.card-footer { display: flex; justify-content: center; margin-top: 12px; margin-bottom: 4px; }
.row{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0} .row>*{flex:1;min-width:0}

.pill {
  display:inline-flex;align-items:center;justify-content:center;gap:6px; background: var(--card); border: 1px solid var(--line); padding:8px 16px; border-radius:20px; font-size:0.9rem; font-weight:600; color:var(--fg); cursor:pointer; transition:all 0.15s; box-shadow: 0 2px 5px rgba(0,0,0,0.03);
  user-select: none; -webkit-user-select: none;
}
.pill:active { transform: scale(0.95); background: var(--input-bg); }
.pill.active { background:var(--accent); color:#fff; border-color:var(--accent); box-shadow: 0 4px 12px rgba(0,122,255,0.3); }

/* Filter Row (Liquid Style) - Edge-to-Edge */
.filter-row-container {
  display: flex; align-items: center; gap: 10px; overflow-x: auto; 
  padding: 4px 20px 12px 20px; /* Padding inside matches page gutter */
  margin: 0 -20px 4px -20px; /* Negative margin to pull to edges */
  scrollbar-width: none; -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
.filter-row-container::-webkit-scrollbar { display: none; }

.glass-pill {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  padding: 0 18px; height: 42px; border-radius: 24px;
  font-size: 0.9rem; font-weight: 600;
  background: rgba(245, 245, 247, 0.65);
  backdrop-filter: blur(12px) saturate(180%); -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: var(--muted);
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
  cursor: pointer; box-sizing: border-box;
}
.glass-pill:active { transform: scale(0.96); }
.glass-pill.active {
  background: var(--fg); color: var(--bg); border-color: transparent;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}
.glass-pill.icon-only { width: 42px; padding: 0; border-radius: 50%; }

@media (prefers-color-scheme: dark) {
  .glass-pill {
    background: rgba(28, 28, 30, 0.6); border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  }
  .glass-pill.active {
    background: var(--fg); color: var(--bg);
    box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  }
}

.std { font:inherit; padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:var(--card); color:var(--fg); width:100%; box-sizing:border-box; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.03); transition: all 0.2s; }
.std:active { transform: scale(0.97); background: var(--input-bg); }

.btn-solid-danger {
  font:inherit; padding:12px 14px; border-radius:12px; border:none; width:100%; box-sizing:border-box; font-weight: 600; cursor: pointer; transition: all 0.2s;
  background: var(--danger); color: white; box-shadow: 0 4px 12px rgba(255, 69, 58, 0.3);
}
.btn-solid-danger:active { transform: scale(0.96); opacity: 0.9; }

input,select,textarea { font:inherit; padding:12px 14px; border-radius:12px; border:none; background:var(--input-bg); color:var(--fg); width:100%; box-sizing:border-box; }
input:focus, select:focus, textarea:focus { outline: 2px solid var(--accent); background: var(--card); }

/* Icons & Buttons */
.glass-close-btn { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; line-height: 1; padding-bottom: 2px; cursor: pointer; background: rgba(200, 200, 210, 0.5); backdrop-filter: blur(16px) saturate(1.5); -webkit-backdrop-filter: blur(16px) saturate(1.5); border: 1px solid rgba(255, 255, 255, 0.5); color: rgba(60, 60, 70, 0.85) !important; transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease; z-index: 50; box-shadow: 0 2px 12px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.6); }
.glass-close-btn:active { transform: scale(0.85); background: rgba(140, 140, 155, 0.7); box-shadow: 0 0 2px rgba(0,0,0,0.15), inset 0 2px 4px rgba(0,0,0,0.1); }
@media (prefers-color-scheme: dark) { .glass-close-btn { background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255,255,255,0.9) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.1); } }

.settings-header { display: flex; gap: 8px; align-items: center; }
.settings-input { flex: 1; }
.settings-toggle-btn { width: 44px; height: 44px; border-radius: 12px; background: var(--input-bg); border: none; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: var(--muted); cursor: pointer; transition: all 0.2s; }
.settings-content { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease; }
.settings-content.open { max-height: 500px; opacity: 1; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }

.page-content{ padding: calc(env(safe-area-inset-top) + 8px) 20px 120px; min-height: 100dvh; min-height: 100vh; box-sizing: border-box; }
.topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 0;margin-bottom:16px;}

.view-fade { animation: pageFadeIn 0.25s ease-out; }

/* Panel (Chips + Input) */
.player-wrapper-card {
  background: var(--card); border-radius: 24px; padding: 20px; margin: 16px 0;
  box-shadow: var(--shadow); border: 1px solid var(--line);
  overflow: hidden;
}

/* Player Cards Stack */
.player-cards-container {
  display: flex; flex-direction: column; gap: 12px; margin-top: 24px;
}

/* Chip Container */
.chip-container {
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; justify-content: flex-start;
}
.chip-container .pill {
  flex: 0 0 auto; margin: 0;
}

/* Input Row */
.add-player-row {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.add-player-input { flex: 1; min-width: 200px; }
.add-player-btn { flex: 0 0 auto; width: auto; }
@media(max-width: 480px) {
  .add-player-input { min-width: 100%; }
  .add-player-btn { width: 100%; flex: 1; }
}

/* Swipeable Row Wrapper & Animations */
.swipe-row-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  /* background: transparent; Wrapper is transparent to avoid bleed, foreground card has BG */
  /* Transition for height collapse on delete */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 160px; /* Approximate height of card */
  opacity: 1;
  animation: slideIn 0.25s ease-out backwards;
}

.swipe-row-wrapper.removing {
  max-height: 0;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  opacity: 0;
  transform: translateX(-20px);
}

/* Actions Background (Delete Button) */
.swipe-actions {
  position: absolute;
  top: 0; bottom: 0; right: 0; left: 0;
  background: var(--danger);
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-right: 24px;
  border-radius: 24px;
  transition: opacity 0.1s;
}
.delete-action-btn {
  background: transparent;
  border: none;
  color: white;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  text-transform: uppercase;
}

/* Card Content (Foreground) */
.player-card-content {
  position: relative;
  z-index: 2;
  background: var(--card); /* Neutral dark card bg */
  border: 1px solid var(--line);
  border-radius: 24px;
  padding: 16px 16px;
  touch-action: pan-y;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

/* New Flex Layout for Card */
.player-card-flex {
  display: flex;
  align-items: center;
  gap: 10px; /* Reduced gap to allow name to expand */
  min-height: 90px;
}

.name-section {
  flex: 1.8;
  min-width: 0;
  display: flex;
  align-items: center;
}

.controls-section {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  width: 24px;
  text-align: right;
  letter-spacing: 0.5px;
}

.name-input {
  width: 100%; background: transparent; font-weight: 600; font-size: 0.95rem; padding: 0; border: none; color: var(--fg);
  text-overflow: ellipsis; display: block;
}
.name-input:focus { background: var(--input-bg); padding: 4px; margin: -4px; border-radius: 6px; }

/* Styled Stepper Pill - Compact */
.stepper-pill {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--stepper-bg); border-radius: 30px; padding: 2px 4px;
  height: 40px; width: 108px; /* Compact width */
  transition: background-color 0.2s;
}
.stepper-pill button {
  width: 32px; height: 32px; border: none; background: transparent; border-radius: 50%; color: var(--fg); font-size: 1.3rem; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin: 0;
}
.stepper-pill button:active { background: rgba(0,0,0,0.1); transform: scale(0.9); }
/* Money input inside stepper */
.money-input {
  flex: 1; min-width: 0; text-align: center; background: transparent; padding: 0; font-size: 1rem; font-weight: 500; outline: none !important; border: none !important; color: var(--fg);
}

/* Result Pill (Win/Loss) - Compact */
.result-pill {
  display: inline-flex; align-items: center; justify-content: space-between;
  background: var(--pill-bg); padding: 3px 8px 3px 4px;
  border-radius: 30px;
  height: 40px; width: 108px; /* Slightly wider for gap */
  font-weight: 600; font-size: 0.95rem; color: var(--fg);
  box-sizing: border-box;
  white-space: nowrap;
  transition: background-color 0.25s ease-out, color 0.25s ease-out, transform 0.2s ease-out;
}
.result-pill span { margin-left: 4px; } /* Extra spacing for text */
.status-circle {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  transition: background-color 0.25s ease-out;
}
.status-circle.pos { background: var(--success); }
.status-circle.neg { background: var(--danger); }
.status-circle.zero { background: var(--orange); color: #fff; } /* Orange neutral */

/* Auto Balance Button */
.ab-button {
  width: 36px; height: 36px; border-radius: 50%; 
  background: var(--input-bg); color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer; transition: all 0.2s;
  margin-left: auto; /* Push to right */
}
.ab-button svg { width: 18px; height: 18px; fill: currentColor; }
.ab-button.active {
  background: var(--accent); color: white;
  box-shadow: 0 2px 8px rgba(0,122,255,0.4);
}
.ab-button:active { transform: scale(0.9); }

/* Action Buttons */
.action-bar-static { display: flex; gap: 12px; margin-top: 32px; }
.action-btn { flex: 1; border: none; padding: 16px; border-radius: 18px; font-weight: 600; font-size: 1rem; cursor: pointer; background: var(--card); color: var(--fg); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid var(--line); transition: all 0.2s; }
.action-btn:hover { background: var(--hint); }
.action-btn.primary { background: var(--fg); color: var(--bg); border: none; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
@media (prefers-color-scheme: dark) { .action-btn.primary { box-shadow: 0 8px 20px rgba(255,255,255,0.1); } }
.action-btn:active { transform: scale(0.96); opacity: 0.9; }

/* Modals & History */
.list-item { display: flex; align-items: center; padding: 14px 12px 14px 16px; border-bottom: 1px solid var(--line); cursor: pointer; transition: background 0.2s; }
.list-item:last-child { border-bottom: none; }
.list-rank { 
  width: 30px; height: 30px; font-weight: 700; font-size: 0.85rem; color: var(--muted); 
  text-align: center; margin-right: 16px; flex-shrink: 0; 
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%; background: var(--bg);
}
.list-rank.gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.list-rank.silver { background: linear-gradient(135deg, #C0C0C0, #A0A0A0); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.list-rank.bronze { background: linear-gradient(135deg, #CD7F32, #A0522D); color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.list-content { flex: 1; min-width: 0; }
.list-title { font-weight: 600; font-size: 1rem; color: var(--fg); margin-bottom: 2px; }
.list-sub { font-size: 0.85rem; color: var(--muted); }
.list-value { font-weight: 700; font-size: 1rem; white-space: nowrap; margin-left: 12px; }
.list-value.pos { color: var(--success); }
.list-value.neg { color: var(--danger); }

/* iOS Bottom Sheet (stackable + stable animations + no bottom gray bar) */
.modal-overlay{
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: 
    opacity 0.35s cubic-bezier(0.25, 0.8, 0.25, 1),
    backdrop-filter 0.35s cubic-bezier(0.25, 0.8, 0.25, 1),
    -webkit-backdrop-filter 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.modal-overlay.blocking {
  pointer-events: auto;
}
.modal-overlay.not-blocking {
  pointer-events: none;
}

/* Bottom sheet */
.modal-content{
  --stack-offset: 0px;
  position: relative;
  width: min(600px, 100vw);
  margin: 0 auto;

  background: var(--card);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 60px rgba(0,0,0,0.3);

  display: flex;
  flex-direction: column;

  /* iets ruimer (optioneel), maar vooral: max-height op viewport */
  height: min(92dvh, calc(100dvh - env(safe-area-inset-top) - 12px));
  max-height: calc(100dvh - env(safe-area-inset-top) - 12px);

  /* BELANGRIJK: safe-area niet hier */
  padding-bottom: 0;

  overflow: hidden; /* voorkomt “extra” scroll/bleed in iOS */
  --header-overlap: 90px;       /* tweak: 60–90px */

  transform: translate3d(0, calc(110% + var(--stack-offset)), 0);
  transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: transform;
}

.modal-content.open{
  transform: translate3d(0, var(--stack-offset), 0);
}

/* Closing state - faster, more accelerated exit */
.modal-content.closing {
  transform: translate3d(0, calc(110% + var(--stack-offset)), 0);
  transition: transform 0.28s cubic-bezier(0.4, 0, 1, 1);
}

.modal-grabber {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.35);
  margin: 8px auto 4px;
  flex-shrink: 0;
}
@media (prefers-color-scheme: light) {
  .modal-grabber { background: rgba(0,0,0,0.18); }
}

.modal-header-wrapper {
  flex: 0 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 10;
  /* Very subtle gradient fade to avoid visible lines */
  background: linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 100%);
}

@media (prefers-color-scheme: light){
  .modal-header-wrapper{ 
    background: linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 100%); 
  }
}

.modal-header-wrapper::after{
  display: none;
}

.modal-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0 16px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.modal-sticky-content {
  padding-bottom: 12px;
}

.modal-subtitle { font-size: 0.85rem; color: var(--muted); margin-top: 4px; font-weight: 500; }

.modal-body{
  flex: 1 1 auto;
  min-height: 0; /* BELANGRIJK voor flex + overflow scroll */

  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  /* safe-area + normale padding onderin IN de scroller */
  padding: 0 24px calc(24px + env(safe-area-inset-bottom));

   /* nieuw: content een klein stukje onder de header + fade */
  /* laat content achter de header “doorlopen” */
  margin-top: calc(-1 * var(--header-overlap));
  padding-top: calc(var(--header-overlap) + 12px);

  /* Extended mask for smoother fade out under header */
-webkit-mask-image: linear-gradient(
  to bottom,
  rgba(0,0,0,0)    0px,
  rgba(0,0,0,0.02) 12px,
  rgba(0,0,0,0.08) 24px,
  rgba(0,0,0,0.18) 36px,
  rgba(0,0,0,0.32) 48px,
  rgba(0,0,0,0.50) 62px,
  rgba(0,0,0,0.68) 76px,
  rgba(0,0,0,0.82) 90px,
  rgba(0,0,0,0.93) 105px,
  rgba(0,0,0,1)    120px
);
mask-image: linear-gradient(
  to bottom,
  rgba(0,0,0,0)    0px,
  rgba(0,0,0,0.02) 12px,
  rgba(0,0,0,0.08) 24px,
  rgba(0,0,0,0.18) 36px,
  rgba(0,0,0,0.32) 48px,
  rgba(0,0,0,0.50) 62px,
  rgba(0,0,0,0.68) 76px,
  rgba(0,0,0,0.82) 90px,
  rgba(0,0,0,0.93) 105px,
  rgba(0,0,0,1)    120px
);  
-webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
          mask-size: 100% 100%;
}

.chart-box{position:relative;width:100%;height:220px;margin:16px 0;}
.heatmap-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; justify-content: center; }
.heatmap-dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); }

/* History Tables & Accordion */
.history-details { background: var(--input-bg); padding: 12px; border-radius: 12px; margin-top: 8px; font-size: 0.9rem; }
.history-grid-row { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(0,0,0,0.05); }
.history-grid-row:last-child { border: none; }
.history-col { text-align: right; }
.history-col:first-child { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.history-accordion {
  display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.25s ease-out, opacity 0.25s ease-out; opacity: 0;
}
.history-accordion.open { grid-template-rows: 1fr; opacity: 1; }
.history-accordion-inner { overflow: hidden; }

/* Stat Cards - Compact & Reusable */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.stat-card { 
  background: var(--card); 
  padding: 8px 6px; 
  border-radius: 14px; 
  /* Strong layered shadow for dark mode visibility */
  box-shadow:
    0 2px 4px rgba(0,0,0,0.25),
    0 4px 8px rgba(0,0,0,0.2),
    0 8px 16px rgba(0,0,0,0.15);
  border: 1px solid var(--line); 
  display: flex; 
  flex-direction: column; 
  justify-content: center; 
  text-align: center; 
  min-height: 60px; 
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out; 
}
.stat-card.interactive { cursor: pointer; }
.stat-card.interactive:active { 
  transform: scale(0.96); 
  box-shadow:
    0 1px 1px rgba(0,0,0,0.03),
    0 2px 3px rgba(0,0,0,0.03);
}
.stat-card.full-width { grid-column: 1 / -1; }
/* Light mode - subtle shadows */
@media (prefers-color-scheme: light) {
  .stat-card {
    box-shadow:
      0 1px 2px rgba(0,0,0,0.04),
      0 2px 4px rgba(0,0,0,0.04),
      0 4px 8px rgba(0,0,0,0.05);
  }
}
.stat-label { font-size: 0.75rem; color: var(--muted); margin-bottom: 2px; font-weight: 600; display:flex; align-items:center; justify-content:center; gap:3px; line-height: 1.2; }
.stat-value { font-size: 0.95rem; font-weight: 700; color: var(--fg); line-height: 1.2; }
.stat-sub { font-size: 0.7rem; color: var(--muted); margin-top: 2px; line-height: 1.2; }


/* Loading Spinner */
.loading-spinner {
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 40px auto;
}
@keyframes spin { to { transform: rotate(360deg); } }

@keyframes pageFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Page view transitions */
@keyframes viewFadeIn {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
.view-fade {
  animation: viewFadeIn 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}


@keyframes pill-pulse {
  0% { transform: scale(0.96); opacity: 0.85; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.pulse-anim {
  animation: pill-pulse 0.25s ease-out;
}

@keyframes morphPop {
  0% { transform: translate3d(20px,0,0) scale(0.85); }
  60% { transform: translate3d(-3px,0,0) scale(1.04); }  /* Overshoot */
  100% { transform: translate3d(0,0,0) scale(1); }
}

@keyframes chipIn { from { opacity: 0; transform: scale3d(0.8, 0.8, 1); } to { opacity: 1; transform: scale3d(1, 1, 1); } }
@keyframes chipOut { from { opacity: 1; transform: scale3d(1, 1, 1); } to { opacity: 0; transform: scale3d(0.8, 0.8, 1); } }
.chip-enter { animation: chipIn 0.2s ease-out backwards; }
.chip-exit { animation: chipOut 0.2s ease-out forwards; pointer-events: none; }

/* Toast Notification - Top Notification Style */
.toast-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 20px;
  padding-top: calc(12px + env(safe-area-inset-top, 0px));
  z-index: 4000;
  pointer-events: none;
  display: flex;
  justify-content: center;
}
.toast {
  background: rgba(255, 69, 58, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: white;
  padding: 16px 28px;
  border-radius: 32px;
  font-size: 0.95rem;
  font-weight: 600;
  min-width: 320px;
  justify-content: space-between;
  box-shadow: 
    0 8px 32px rgba(255, 69, 58, 0.4),
    0 0 0 1px rgba(255,255,255,0.2) inset;
  display: flex;
  align-items: center;
  gap: 16px;
  pointer-events: auto;
  animation: toastSlideDown 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast.success {
  background: rgba(48, 209, 88, 0.88);
  box-shadow: 
    0 8px 32px rgba(48, 209, 88, 0.4),
    0 0 0 1px rgba(255,255,255,0.2) inset;
}
.toast.exiting {
  animation: toastSlideUp 0.25s ease-in forwards;
}
.toast-btn {
  background: rgba(255,255,255,0.25);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.toast-btn:active { transform: scale(0.95); background: rgba(255,255,255,0.35); }
@keyframes toastSlideDown { 
  from { opacity: 0; transform: translate3d(0, -100%, 0); } 
  to { opacity: 1; transform: translate3d(0, 0, 0); } 
}
@keyframes toastSlideUp { 
  from { opacity: 1; transform: translate3d(0, 0, 0); } 
  to { opacity: 0; transform: translate3d(0, -100%, 0); } 
}
`;

// --- HELPERS ---
function euro(n: number) { return n.toLocaleString('nl-NL', { style: 'currency', currency: 'EUR' }); }
function parseNum(v: any) { if (v === '' || v == null) return NaN; let s = String(v).replace(',', '.'); const n = Number(s); return Number.isFinite(n) ? n : NaN; }
function roundTo(x: number, step: number) { const inv = 1 / step; return Math.round(x * inv) / inv; }
function formatDec(val: string | number) {
  if (val === '' || val === null || val === undefined) return '0,00';
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  if (isNaN(num)) return '0,00';
  return num.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function matchSessionByQuery(query: string, session: any): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;

  const date = new Date(session.date);
  const dateStr = date.toLocaleDateString('nl-NL').toLowerCase(); // d-m-yyyy
  const day = date.getDate();
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();

  // Title/description match
  if ((session.desc || '').toLowerCase().includes(q)) return true;

  // Player names match - search if any player in the session matches
  const playerNames = (session.players || []).map((p: any) => p.name.toLowerCase()).join(' ');
  if (playerNames.includes(q)) return true;

  // Direct date string match (e.g. 8-12-2025)
  if (dateStr.includes(q)) return true;

  // Year match (e.g. "2024", "2025")
  if (q.match(/^\d{4}$/) && year === parseInt(q)) return true;

  // Relative dates
  const today = new Date();

  // "vandaag" (today)
  if (q.includes('vandaag')) {
    if (date.toDateString() === today.toDateString()) return true;
  }

  // "gisteren" or "gister" (yesterday)
  if (q.includes('gister')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return true;
  }

  // "deze week" (this week)
  if (q.includes('deze week') || q.includes('week')) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    if (date >= startOfWeek && date <= endOfWeek) return true;
  }

  // "deze maand" (this month)
  if (q.includes('deze maand') || q.includes('maand')) {
    if (date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) return true;
  }

  // Short month names (3 letters)
  const shortMonths = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

  // Full month names in Dutch
  const fullMonths = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

  // Check for full month names first (must be before short to avoid partial matches)
  for (let i = 0; i < 12; i++) {
    if (q.includes(fullMonths[i])) {
      // Just search by month name alone
      if (month === i) {
        // If there's a day number in the query, match day too
        const dayMatch = q.match(/\b(\d{1,2})\b/);
        if (dayMatch) {
          if (day === parseInt(dayMatch[1])) return true;
        } else {
          // Month only match
          return true;
        }
      }
    }
  }

  // Check for short month names
  for (let i = 0; i < 12; i++) {
    // Make sure we're not matching partial words (e.g., "mei" in "gemiddeld")
    const monthPattern = new RegExp(`\\b${shortMonths[i]}\\b`, 'i');
    if (monthPattern.test(q)) {
      if (month === i) {
        // If there's a day number in the query, match day too
        const dayMatch = q.match(/\b(\d{1,2})\b/);
        if (dayMatch) {
          if (day === parseInt(dayMatch[1])) return true;
        } else {
          // Month only match
          return true;
        }
      }
    }
  }

  // Numeric patterns like "8/12" or "8-12" - normalize to dashes
  const cleanDate = q.replace(/\//g, '-');
  if (dateStr.includes(cleanDate)) return true;

  return false;
}

// --- ICONS ---
const SparklesIcon = () => <svg viewBox="0 0 24 24"><path d="M9.375 3.375 11.25 7.5 15.375 9.375 11.25 11.25 9.375 15.375 7.5 11.25 3.375 9.375 7.5 7.5zM17.625 14.25 18.75 16.75 21.25 17.875 18.75 19 17.625 21.5 16.5 19 14 17.875 16.5 16.75zM17.625 1 18.75 3.5 21.25 4.625 18.75 5.75 17.625 8.25 16.5 5.75 14 4.625 16.5 3.5z" fill="currentColor" /></svg>;
const ArrowUp = () => <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path d="M12 4l-8 8h6v8h4v-8h6z" fill="currentColor" /></svg>;
const ArrowDown = () => <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path d="M12 20l8-8h-6v-8h-4v8h-6z" fill="currentColor" /></svg>;
const Dash = () => <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path d="M5 11h14v2H5z" fill="currentColor" /></svg>;
const FilterIcon = () => <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}><path d="M3 6h18v2H3V6zm3 7h12v2H6v-2zm5 7h2v2h-2v-2z" fill="currentColor" /></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" style={{ width: 22, height: 22 }}><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" /></svg>;

// --- COMPONENTS ---

// --- MODAL STACK (ensures stacking everywhere) ---
const _modalStack: symbol[] = [];
const _stackListeners = new Set<() => void>();

function _notifyStack() {
  _stackListeners.forEach(fn => fn());
}

function pushModalStack(id: symbol) {
  if (_modalStack.includes(id)) return;
  _modalStack.push(id);
  _notifyStack();
}

function removeModalStack(id: symbol) {
  const i = _modalStack.indexOf(id);
  if (i === -1) return;
  _modalStack.splice(i, 1);
  _notifyStack();
}

function getModalStackIndex(id: symbol) {
  return _modalStack.indexOf(id); // 0 = bottom, higher = on top
}

function getModalStackSize() {
  return _modalStack.length;
}

function subscribeModalStack(fn: () => void) {
  _stackListeners.add(fn);
  return () => _stackListeners.delete(fn);
}


// Reusable Stat Tile Component
interface StatTileProps {
  icon?: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'default' | 'positive' | 'negative';
  onClick?: () => void;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const StatTile: React.FC<StatTileProps> = ({ icon, title, value, subtitle, tone = 'default', onClick, fullWidth, children }) => {
  return (
    <div
      className={`stat-card ${fullWidth ? 'full-width' : ''} ${onClick ? 'interactive' : ''}`}
      onClick={onClick}
    >
      <div className="stat-label">
        {icon}
        {title}
      </div>
      {children ? children : (
        <>
          <div
            className="stat-value"
            style={{
              color: tone === 'positive' ? 'var(--success)' : tone === 'negative' ? 'var(--danger)' : 'var(--fg)'
            }}
          >
            {value}
          </div>
          {subtitle && <div className="stat-sub">{subtitle}</div>}
        </>
      )}
    </div>
  );
};

// Chip Component with Long Press for Delete
const PresetChip = ({ name, active, onClick, onDelete, isExiting }: any) => {
  const timer = useRef<any>(null);
  const isLong = useRef(false);

  const startPress = () => {
    isLong.current = false;
    timer.current = setTimeout(() => {
      isLong.current = true;
      if (navigator.vibrate) navigator.vibrate(50);
      onDelete(name);
    }, 600);
  };

  const cancelPress = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  const handleClick = (e: any) => {
    if (isLong.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick(name);
  };

  return (
    <span
      className={`pill ${active ? 'active' : ''} ${isExiting ? 'chip-exit' : 'chip-enter'}`}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onClick={handleClick}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {name}
    </span>
  );
};

// Money Input Component with formatted display on blur
const MoneyInput = ({ value, onChange, placeholder }: any) => {
  const [local, setLocal] = useState(formatDec(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(formatDec(value));
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal(e.target.value);
  };

  const handleBlur = () => {
    setFocused(false);
    let normalized = local.replace(',', '.');
    let num = parseFloat(normalized);
    if (isNaN(num)) num = 0;
    // Update parent with standard number string (dot decimal)
    onChange(num.toFixed(2));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    e.target.select();
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className="money-input"
      value={local}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
    />
  );
};

// Result Pill with Animation
const ResultPill = ({ net }: { net: number }) => {
  const [anim, setAnim] = useState(false);
  const prev = useRef(net);

  useEffect(() => {
    if (prev.current !== net) {
      setAnim(true);
      const t = setTimeout(() => setAnim(false), 250);
      prev.current = net;
      return () => clearTimeout(t);
    }
  }, [net]);

  const absNet = Math.abs(net);
  const isZero = absNet < 0.005;
  const resultText = `€ ${formatDec(absNet)}`;

  return (
    <div className={`result-pill ${anim ? 'pulse-anim' : ''}`}>
      <div className={`status-circle ${isZero ? 'zero' : net > 0 ? 'pos' : 'neg'}`}>
        {net > 0 ? <ArrowUp /> : net < 0 ? <ArrowDown /> : <Dash />}
      </div>
      <span>{resultText}</span>
    </div>
  );
};

// Global Total Pill with Animation
const TotalPill = ({ diff }: { diff: number }) => {
  const [anim, setAnim] = useState(false);
  const prev = useRef(diff);

  useEffect(() => {
    if (Math.abs(prev.current - diff) > 0.001) {
      setAnim(true);
      const t = setTimeout(() => setAnim(false), 250);
      prev.current = diff;
      return () => clearTimeout(t);
    }
  }, [diff]);

  return (
    // Remove "glass" from className - blur is now on separate layer
    <div className={`diff-pill ${Math.abs(diff) < 0.01 ? 'ok' : 'bad'} ${anim ? 'pulse-anim' : ''}`}>
      {euro(diff)}
    </div>
  );
};

// Swipe Row Component (iOS Mail Style) with Exit Animation
const DELETE_BTN_WIDTH = 100;
const PEEK_THRESHOLD = 40;
const DELETE_THRESHOLD = 120;

function SwipeRow({ children, onDelete, forceDelete }: { children: React.ReactNode, onDelete: () => void, forceDelete?: boolean }) {
  const [x, setX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const initX = useRef(0);

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  // Handle external force delete (e.g. from chips)
  useEffect(() => {
    if (forceDelete && !isRemoving) {
      triggerDelete();
    }
  }, [forceDelete]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isRemoving) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    initX.current = x;
    setSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping || isRemoving) return;
    const cx = e.touches[0].clientX;
    const cy = e.touches[0].clientY;
    const dx = cx - startX.current;
    const dy = cy - startY.current;

    // If vertical scroll is dominant, ignore horizontal swipe
    if (Math.abs(dy) > Math.abs(dx)) return;

    // Calculate new X
    let newX = initX.current + dx;

    // Limit: max 0 (can't swipe right past start), min -200 (limit drag)
    if (newX > 0) newX = 0;
    if (newX < -200) newX = -200;

    setX(newX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isRemoving) return;
    setSwiping(false);
    // Determine action based on final position
    if (x < -DELETE_THRESHOLD) {
      triggerDelete();
    } else if (x < -PEEK_THRESHOLD) {
      // Snap open
      setX(-DELETE_BTN_WIDTH);
    } else {
      // Snap closed
      setX(0);
    }
  };

  const triggerDelete = () => {
    setIsRemoving(true);
    setX(-window.innerWidth); // Fly off
    setTimeout(() => {
      if (mounted.current) onDelete();
    }, 300); // Wait for CSS transition
  };

  // Close if tapped when open (on content)
  const handleContentClick = () => {
    if (x < -10 && !isRemoving) setX(0);
  };

  const isClosed = x === 0;

  return (
    <div className={`swipe-row-wrapper ${isRemoving ? 'removing' : ''}`}>
      {/* Only show red background actions when swiped to prevent bleed */}
      <div className="swipe-actions" style={{ visibility: isClosed ? 'hidden' : 'visible' }}>
        <button className="delete-action-btn" onClick={triggerDelete}>Delete</button>
      </div>
      <div
        className="player-card-content"
        style={{ transform: `translateX(${x}px)`, transition: swiping ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  )
}

// Reusable Modal with Close Animation & Swipe Down & Body Scroll Lock
// iOS Bottom Sheet Style: Compact vs Expanded
function GlassModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  zIndex = 3000,          // base z-index
  headerContent,
  headerButtons,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  zIndex?: number;
  headerContent?: React.ReactNode;
  headerButtons?: React.ReactNode;
}) {
  // NEW LOGIC: Render immediately when isOpen is true to support autofocus
  const [isVisible, setIsVisible] = useState(false); // Controls CSS transition class
  const [isMounted, setIsMounted] = useState(false); // Controls DOM existence

  const [dragY, setDragY] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const lockToken = useRef(Symbol("modal-lock"));
  const stackId = lockToken.current;

  const [stackIndex, setStackIndex] = useState(0);
  const [stackSize, setStackSize] = useState(0);

  // Scroll lock: lock when open, unlock immediately when closed
  useEffect(() => {
    if (isOpen) lockScroll(lockToken.current);
    else unlockScroll(lockToken.current);
    return () => unlockScroll(lockToken.current);
  }, [isOpen]);

  // Register in modal stack when open
  useEffect(() => {
    if (!isOpen) return;
    pushModalStack(stackId);
    const unsub = subscribeModalStack(() => {
      setStackIndex(getModalStackIndex(stackId));
      setStackSize(getModalStackSize());
    });

    // initial set
    setStackIndex(getModalStackIndex(stackId));
    setStackSize(getModalStackSize());

    return () => {
      unsub();
      removeModalStack(stackId);
    };
  }, [isOpen, stackId]);

  // Mount/unmount logic
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setDragY(0);
      // Slight delay to allow DOM paint before adding 'open' class for transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      setDragY(0);
      const t = setTimeout(() => {
        setIsMounted(false);
      }, 300); // Match CSS closing animation duration
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const canDrag = () => {
    const body = bodyRef.current;
    return !body || body.scrollTop <= 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent drag if we are in the closing phase
    if (!isOpen && isMounted) return;
    if (!canDrag()) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isOpen && isMounted) return;
    if (!canDrag()) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (!isOpen && isMounted) return;
    if (dragY > 70) onClose();
    else setDragY(0);
  };

  // FORCE RENDER if open, regardless of isMounted state (fixes first-open delay)
  // This ensures children (inputs) are in DOM synchronously when isOpen becomes true
  if (!isOpen && !isMounted) return null;

  // Top modal has biggest index; we offset it down a little so you SEE stacking.
  const isTop = stackIndex === stackSize - 1;
  const offset = Math.min(18, stackIndex * 10); // 0,10,18... (cap)
  const finalZ = 3000 + stackIndex * 20;

  // We are "actually open" if we are visible or currently dragging open
  // But for opacity calculations we rely on isVisible + drag
  const sheetStyle: React.CSSProperties = {
    ...(dragY > 0
      ? { transform: `translate3d(0, ${dragY + offset}px, 0)`, transition: "none" }
      : {}),
    // pass CSS variable for stacking offset when not dragging
    ["--stack-offset" as any]: `${offset}px`,
  };

  // Slower overlay fade - only starts fading after 50px of drag, fades over 400px
  const overlayOpacity =
    dragY > 50 ? Math.max(0.15, 1 - (dragY - 50) / 400) : 1;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={`modal-overlay ${isVisible ? "blocking" : "not-blocking"}`}
      style={{
        zIndex: finalZ,
        opacity: isVisible ? overlayOpacity : 0,
      }}
      onClick={handleOverlayClick}
    >
      <div
        className={`modal-content ${isVisible ? "open" : "closing"}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="modal-grabber" />
        <div className="modal-header-wrapper">
          <div className="modal-title-row">
            <div style={{ flex: 1 }}>
              <h2>{title}</h2>
              {subtitle && <div className="modal-subtitle">{subtitle}</div>}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {headerButtons}
              <button className="glass-close-btn" onClick={onClose}>
                ✕
              </button>
            </div>
          </div>
          {headerContent && <div className="modal-sticky-content">{headerContent}</div>}
        </div>

        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>
      </div>
    </div>
  );
}


// History Item Component with Accordion Animation (also acts as Session Detail content)
const HistoryItem = ({ session, expandedId, onToggle, isPlayerView, onDelete, forceOpen }: any) => {
  const isExpanded = forceOpen || expandedId === session.sessionId;
  const net = session.playerNet;
  const showPlayerResult = isPlayerView && typeof net === 'number';

  return (
    <div style={{ padding: '12px 0', borderBottom: forceOpen ? 'none' : '1px solid var(--line)', cursor: forceOpen ? 'default' : 'pointer' }} onClick={!forceOpen ? () => onToggle(isExpanded ? null : session.sessionId) : undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>{new Date(session.date).toLocaleDateString()}</span>
        {showPlayerResult ? (
          <span style={{ fontWeight: 600, color: net >= 0.005 ? 'var(--success)' : net <= -0.005 ? 'var(--danger)' : 'var(--muted)' }}>
            {euro(net)}
          </span>
        ) : (
          <span className="muted small">{session.desc}</span>
        )}
      </div>
      {!isExpanded && !showPlayerResult && (
        <div className="small muted" style={{ marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {(session.players || []).map((p: any) => p.name).join(', ')}
        </div>
      )}
      {showPlayerResult && !isExpanded && (
        <div className="small muted" style={{ marginTop: '4px' }}>
          {session.desc}
        </div>
      )}

      <div className={`history-accordion ${isExpanded ? 'open' : ''}`}>
        <div className="history-accordion-inner" onClick={e => e.stopPropagation()}>
          <div className="history-details">
            <div className="history-grid-row" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Naam</div>
              <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>In</div>
              <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Uit</div>
              <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Res</div>
            </div>
            {(session.players || []).map((p: any, i: number) => {
              const pNet = typeof p.net === 'number' ? p.net : (p.end - p.buyin);
              return (
                <div key={i} className="history-grid-row">
                  <div className="history-col">{p.name}</div>
                  <div className="history-col" style={{ color: 'var(--muted)' }}>{euro(p.buyin)}</div>
                  <div className="history-col" style={{ color: 'var(--muted)' }}>{euro(p.end)}</div>
                  <div className="history-col" style={{ fontWeight: 600, color: pNet >= 0.005 ? 'var(--success)' : pNet <= -0.005 ? 'var(--danger)' : 'var(--fg)' }}>
                    {euro(pNet)}
                  </div>
                </div>
              )
            })}
            {onDelete && (
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button className="pill" style={{ color: 'var(--danger)' }} onClick={(e) => onDelete(session.sessionId, e)}>Verwijder avond</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Sub-component for Player Detail Chart
function PlayerDetailChart({ sessions, player }: { sessions: any[], player: any }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);

  useEffect(() => {
    if (!player || !chartRef.current || !(window as any).Chart) return;
    if (chartInst.current) chartInst.current.destroy();

    const sessSorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let cum = 0; const data: number[] = []; const labels: string[] = [];
    sessSorted.forEach(s => {
      const pl = (s.players || []).find((p: any) => p.name === player.name);
      if (pl) {
        cum += typeof pl.net === 'number' ? pl.net : (parseNum(pl.end) - parseNum(pl.buyin));
        data.push(cum); labels.push(new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
      }
    });

    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();

    chartInst.current = new (window as any).Chart(chartRef.current, {
      type: 'line',
      data: { labels, datasets: [{ label: 'Totaal', data, borderColor: '#007aff', tension: 0.2 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor } },
          y: { grid: { color: gridColor } }
        }
      }
    });
    return () => { if (chartInst.current) chartInst.current.destroy(); };
  }, [sessions, player]);

  return <div className="chart-box"><canvas ref={chartRef}></canvas></div>;
}

// Sub-component for Overlay Charts
function OverlayCharts({ sessions, stats }: { sessions: any[], stats: any[] }) {
  const refs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)];
  const insts = useRef<any[]>([]);

  useEffect(() => {
    if (!(window as any).Chart) return;
    insts.current.forEach(c => c.destroy()); insts.current = [];

    const sessSorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labelsDate = sessSorted.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
    const names = stats.map((p: any) => p.name);
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor } }
      }
    };

    // 1. Pot
    if (refs[0].current) {
      const dataPot = sessSorted.map(s => (s.players || []).reduce((a: number, p: any) => a + (parseNum(p.buyin) || 0), 0));
      insts.current.push(new (window as any).Chart(refs[0].current, {
        type: 'bar', data: { labels: labelsDate, datasets: [{ label: 'Pot', data: dataPot, backgroundColor: '#007aff', borderRadius: 4 }] },
        options: commonOptions
      }));
    }
    // 2. Cumulative
    if (refs[1].current) {
      const top5 = stats.slice(0, 5);
      const datasets = top5.map((p: any, i: number) => {
        let cum = 0;
        const d = sessSorted.map(s => {
          const pl = (s.players || []).find((x: any) => x.name === p.name);
          cum += pl ? (typeof pl.net === 'number' ? pl.net : (parseNum(pl.end) - parseNum(pl.buyin))) : 0;
          return cum;
        });
        return { label: p.name, data: d, borderColor: `hsl(${i * 60}, 70%, 50%)`, borderWidth: 2, pointRadius: 0, tension: 0.4 };
      });
      insts.current.push(new (window as any).Chart(refs[1].current, {
        type: 'line', data: { labels: labelsDate, datasets },
        options: {
          ...commonOptions,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { display: false } }
        }
      }));
    }
    // 3. Profit
    if (refs[2].current) insts.current.push(new (window as any).Chart(refs[2].current, { type: 'bar', data: { labels: names, datasets: [{ label: 'Winst', data: stats.map((p: any) => p.total), backgroundColor: stats.map((p: any) => p.total >= 0 ? '#34c759' : '#ff3b30') }] }, options: commonOptions }));
    // 4. Stake
    if (refs[3].current) insts.current.push(new (window as any).Chart(refs[3].current, { type: 'bar', data: { labels: names, datasets: [{ label: 'Inzet', data: stats.map((p: any) => p.stake), backgroundColor: '#007aff' }] }, options: commonOptions }));
    // 5. Win Rate
    if (refs[4].current) {
      // FILTER: Only players with >= 3 sessions
      const filteredStats = stats.filter((p: any) => p.count >= 3);
      const filteredNames = filteredStats.map((p: any) => p.name);
      const filteredData = filteredStats.map((p: any) => p.winRate);

      insts.current.push(new (window as any).Chart(refs[4].current, {
        type: 'bar',
        data: { labels: filteredNames, datasets: [{ label: 'Win %', data: filteredData, backgroundColor: '#ffcc00' }] },
        options: commonOptions
      }));
    }

    return () => { insts.current.forEach(c => c.destroy()); insts.current = []; };
  }, [sessions, stats]);

  return (
    <>
      <h4>Pot verloop</h4>
      <div className="small muted" style={{ marginBottom: '8px' }}>Totale pot per avond (gefilterde avonden).</div>
      <div className="chart-box"><canvas ref={refs[0]}></canvas></div>

      <h4>Cumulatief verloop</h4>
      <div className="small muted" style={{ marginBottom: '8px' }}>Totaalresultaat over avonden, cumulatief opgebouwd.</div>
      <div className="chart-box"><canvas ref={refs[1]}></canvas></div>

      <h4>Winst per speler</h4>
      <div className="small muted" style={{ marginBottom: '8px' }}>Totaalresultaat per speler (som van alle gefilterde avonden).</div>
      <div className="chart-box"><canvas ref={refs[2]}></canvas></div>

      <h4>Inzet per speler</h4>
      <div className="small muted" style={{ marginBottom: '8px' }}>Totale inleg per speler (som van alle gefilterde avonden).</div>
      <div className="chart-box"><canvas ref={refs[3]}></canvas></div>

      <h4>Win Percentage</h4>
      <div className="small muted" style={{ marginBottom: '8px' }}>Percentage avonden dat een speler in de plus eindigt (alleen spelers met ≥ 3 avonden).</div>
      <div className="chart-box"><canvas ref={refs[4]}></canvas></div>
    </>
  );
}

// --- LOGIC ---
function settle(entries: any[], rounding: number, strategy: string) {
  let creditors = [], debtors = [], sum = 0;
  for (const e of entries) {
    const a = roundTo(e.amount, rounding); sum += a;
    if (a > 1e-9) creditors.push({ ...e, amount: a });
    else if (a < -1e-9) debtors.push({ ...e, amount: -a });
  }
  if (strategy === 'largest') {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
  } else {
    creditors.sort((a, b) => a.order - b.order);
    debtors.sort((a, b) => a.order - b.order);
  }

  const transfers = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i], c = creditors[j];
    const amount = Math.min(d.amount, c.amount);
    const amtR = roundTo(amount, rounding);
    if (amtR > 0) {
      transfers.push({ from: d.name, to: c.name, amount: amtR });
      d.amount = roundTo(d.amount - amtR, rounding);
      c.amount = roundTo(c.amount - amtR, rounding);
    }
    if (d.amount <= 1e-9) i++;
    if (c.amount <= 1e-9) j++;
  }

  return { transfers, residual: roundTo(sum, rounding) };
}

type StatsFilterId = 'all' | 'last5' | 'last10' | 'thisYear' | 'customLastN';

function filterSessionsForStats(allSessions: any[], filter: StatsFilterId, customLastN: number) {
  // Ensure descending sort first
  const sorted = [...allSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  switch (filter) {
    case 'last5': return sorted.slice(0, 5);
    case 'last10': return sorted.slice(0, 10);
    case 'customLastN': return sorted.slice(0, customLastN);
    case 'thisYear':
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
      return sorted.filter(s => new Date(s.date).getTime() >= startOfYear);
    case 'all':
    default: return sorted;
  }
}

// --- DATABASE ---
const DB_NAME = 'poker_split_history_v1';
const STORE = 'sessions';
function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'sessionId' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveSessionToDB(session: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function getAllSessions() {
  const db = await openDB();
  return new Promise<any[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function deleteSessionFromDB(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// --- Morphing FAB Component ---
const MorphingFab = ({
  view,
  diff,
  onSearchClick
}: {
  view: 'calculator' | 'stats',
  diff: number,
  onSearchClick: () => void
}) => {
  const isCalculator = view === 'calculator';
  return (
    <div className="morphing-fab-container">
      {/* Search blur layer - fixed size, works great */}
      <div className={`morph-blur-layer ${!isCalculator ? 'visible' : 'hidden'}`} />
      {/* TotalPill - no blur layer needed, solid bg */}
      <div className={`morph-layer ${isCalculator ? 'visible' : 'hidden'}`}>
        <TotalPill diff={diff} />
      </div>
      {/* Search Icon */}
      <div className={`morph-layer ${!isCalculator ? 'visible' : 'hidden'}`}>
        <div className="floating-search-button" onClick={onSearchClick}>
          <SearchIcon />
        </div>
      </div>
    </div>
  );
};

// --- APP ---

function App() {
  const [view, setView] = useState<'calculator' | 'stats'>('calculator');
  const [diff, setDiff] = useState(0);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Data version counter for cache invalidation
  const [dataVersion, setDataVersion] = useState(0);
  const handleSessionSaved = () => setDataVersion(v => v + 1);

  return (
    <>
      <style>{STYLES}</style>
      <div className="statusbar-blur"></div>
      <div className="page-content">
        <header className="topbar">
          <h1 key={view} className="view-fade">{view === 'calculator' ? '💸 Poker Split' : '📊 Statistieken'}</h1>
        </header>

        <main>
          <div style={{ display: view === 'calculator' ? 'block' : 'none' }}>
            <Calculator onDiffChange={setDiff} isActive={view === 'calculator'} onSessionSaved={handleSessionSaved} />
          </div>
          <div style={{ display: view === 'stats' ? 'block' : 'none' }}>
            <Stats showSearchModal={showSearchModal} setShowSearchModal={setShowSearchModal} isActive={view === 'stats'} dataVersion={dataVersion} onDataChanged={handleSessionSaved} />
          </div>
        </main>
      </div>

      <div className="floating-dock-left">
        <div className="glass nav-container">
          <div className="nav-bg" style={{ transform: view === 'calculator' ? 'translateX(0%)' : 'translateX(100%)' }} />
          <button className={`nav-btn ${view === 'calculator' ? 'active' : ''}`} onClick={() => setView('calculator')}>Calculator</button>
          <button className={`nav-btn ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>Stats</button>
        </div>
      </div>

      <MorphingFab
        view={view}
        diff={diff}
        onSearchClick={() => setShowSearchModal(true)}
      />
    </>
  );
}

function Calculator({ onDiffChange, isActive, onSessionSaved }: { onDiffChange: (n: number) => void, isActive: boolean, onSessionSaved: () => void }) {
  const [desc, setDesc] = useState('Pokeravond');
  const [players, setPlayers] = useState<any[]>([
    { id: 1, name: 'Julian', buyin: '10', end: '', ab: true },
    { id: 2, name: 'Tyson', buyin: '10', end: '', ab: true }
  ]);
  const [settings, setSettings] = useState({
    defaultBuyin: '10', round: '0.01', strategy: 'largest', perspective: 'receiver', autoBalance: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [autoBalanceInfo, setAutoBalanceInfo] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  // Presets State
  const [presetList, setPresetList] = useState<string[]>([]);
  const [exitingChips, setExitingChips] = useState<Set<string>>(new Set());
  const [importText, setImportText] = useState('');

  // Toast state
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('poker_split_state');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.players) setPlayers(s.players);
        if (s.desc) setDesc(s.desc);
        if (s.settings) setSettings(prev => ({ ...prev, ...s.settings }));
      }

      const savedPresets = localStorage.getItem('poker_split_presets');
      if (savedPresets) {
        setPresetList(JSON.parse(savedPresets));
      } else {
        setPresetList([]); // Default empty
      }
    } catch (e) { }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('poker_split_state', JSON.stringify({ players, desc, settings })), 500);
    return () => clearTimeout(timer);
  }, [players, desc, settings]);

  const savePresetsToStorage = (list: string[]) => {
    localStorage.setItem('poker_split_presets', JSON.stringify(list));
  };

  const addPreset = (name: string) => {
    if (presetList.includes(name)) return;
    const newPresets = [...presetList, name].sort((a, b) => a.localeCompare(b));
    setPresetList(newPresets);
    savePresetsToStorage(newPresets);
  };

  const removePreset = (name: string) => {
    if (confirm(`Preset "${name}" verwijderen?`)) {
      setExitingChips(prev => new Set(prev).add(name));
      setTimeout(() => {
        const next = presetList.filter(p => p !== name);
        setPresetList(next);
        savePresetsToStorage(next);
        setExitingChips(prev => {
          const n = new Set(prev); n.delete(name); return n;
        });
        // Also remove active player card if preset removed
        const p = players.find(pl => pl.name === name);
        if (p) triggerRemove(p.id);
      }, 200);
    }
  };

  const handleImportPresets = () => {
    if (!importText.trim()) return;
    const names = importText.split(',').map(s => s.trim()).filter(Boolean);
    const unique = [...new Set(names)].sort((a, b) => a.localeCompare(b));

    // Identify removed presets to animate out
    const toRemove = presetList.filter(p => !unique.includes(p));
    setExitingChips(new Set(toRemove));

    setTimeout(() => {
      setPresetList(unique);
      savePresetsToStorage(unique);
      setExitingChips(new Set());
      setImportText('');
      alert('Presets geïmporteerd!');

      // Remove active cards not in new list
      players.forEach(p => {
        if (!unique.includes(p.name)) triggerRemove(p.id);
      });
    }, 200);
  };

  const entries = useMemo(() => players.map((p, i) => ({ ...p, amount: (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0), order: i })), [players]);
  const total = entries.reduce((a, e) => a + e.amount, 0);

  useEffect(() => { onDiffChange(total); }, [total, onDiffChange]);

  const addPlayer = (name: string) => {
    // Add to presets if new
    if (!presetList.includes(name)) {
      addPreset(name);
    }
    // Add card if not active
    const exists = players.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      setPlayers(p => [...p, { id: Date.now() + Math.random(), name, buyin: settings.defaultBuyin, end: '', ab: true }]);
    }
  };

  const updatePlayer = (id: number, field: string, val: any) => setPlayers(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));

  const removePlayer = (id: number) => {
    setPlayers(p => p.filter(x => x.id !== id));
    setRemovingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const triggerRemove = (id: number) => {
    setRemovingIds(prev => new Set(prev).add(id));
    // wait for animation handled by SwipeRow forceDelete
  };

  const handleClearAll = () => {
    const ids = players.map(p => p.id);
    if (ids.length === 0) return;
    setRemovingIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  };

  const stepVal = (id: number, field: 'buyin' | 'end', delta: number) => {
    setPlayers(p => p.map(x => {
      if (x.id !== id) return x;
      return { ...x, [field]: ((parseNum(x[field]) || 0) + delta).toFixed(2) };
    }));
  };
  const toggleAB = (id: number) => setPlayers(p => p.map(x => x.id === id ? { ...x, ab: !x.ab } : x));

  const handlePaste = async () => {
    let txt = '';
    try { txt = await navigator.clipboard.readText(); } catch (e) { }
    if (!txt) txt = prompt('Plak lijst (Naam, inzet, eind):') || '';
    if (!txt) return;
    const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const newPlayers: any[] = [];
    for (const raw of lines) {
      const parts = raw.split(/[;,|\t]/).map(s => s.trim());
      if (parts.length >= 2) {
        const buy = parseNum(parts[1]) || 0;
        const end = parts.length > 2 ? parseNum(parts[2]) : (buy + (parseNum(parts[1]) || 0));
        const name = parts[0];
        // Add to presets as well
        if (!presetList.includes(name)) addPreset(name);
        newPlayers.push({ id: Date.now() + Math.random(), name, buyin: String(buy), end: String(end), ab: true });
      }
    }
    if (newPlayers.length) setPlayers(prev => [...prev, ...newPlayers]);
  };

  const handleCalculate = () => {
    let activeEntries = entries.map(e => ({ ...e }));
    let abInfo = null;

    if (settings.autoBalance && Math.abs(total) > 0.005) {
      const sign = total > 0 ? 1 : -1;
      let pool = activeEntries.filter(e => e.ab && (sign > 0 ? e.amount > 0 : e.amount < 0));
      if (!pool.length) pool = activeEntries.filter(e => e.ab);
      if (pool.length) {
        const picked = pool[Math.floor(Math.random() * pool.length)];
        const idx = activeEntries.findIndex(e => e.id === picked.id);
        if (idx >= 0) {
          activeEntries[idx].amount = roundTo(activeEntries[idx].amount - total, 0.01);
          abInfo = `Auto-balance: ${euro(-total)} op ${picked.name}`;
        }
      }
    }
    setAutoBalanceInfo(abInfo);
    setResult(settle(activeEntries, Number(settings.round), settings.strategy));
    setTimeout(() => document.getElementById('result-area')?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveSession = async () => {
    if (!players.filter(p => p.name).length) return alert('Geen spelers.');
    const session = {
      sessionId: new Date().toISOString() + '_' + Math.random().toString(36).slice(2),
      date: new Date().toISOString(),
      desc,
      players: players.map(p => ({ name: p.name, buyin: parseNum(p.buyin) || 0, end: parseNum(p.end) || 0, net: (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0) }))
    };
    try {
      await saveSessionToDB(session);
      onSessionSaved(); // Notify App that data changed
      handleCalculate();

      // Show success toast
      setShowSuccessToast(true);
      setTimeout(() => {
        setToastExiting(true);
        setTimeout(() => {
          setShowSuccessToast(false);
          setToastExiting(false);
        }, 250);
      }, 2000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Opslaan mislukt. Probeer het opnieuw.');
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const lines = [`💸 ${desc}`, `📅 ${new Date().toLocaleDateString()}`, '', 'Resultaat:'];
    entries.forEach(e => lines.push(`• ${e.name}: ${e.amount > 0 ? '+' : ''}${euro(e.amount)}`));
    lines.push('', 'Tikkies:');
    if (!result.transfers.length) lines.push('Niemand hoeft te betalen.');
    else result.transfers.forEach((t: any) => lines.push(`• ${t.to} → ${t.from}: ${euro(t.amount)}`)); // Receiver sends tikkie to Payer

    if (autoBalanceInfo) lines.push('', autoBalanceInfo);

    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch (e) { return; }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  };

  return (
    <div>
      {/* Settings */}
      <div className="card">
        <div className="settings-header">
          <input className="settings-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Omschrijving (bv. Pokeravond)" />
          <button className={`settings-toggle-btn ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)}>
            <span style={{ display: 'inline-block', transition: 'transform 0.3s', transform: showSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </button>
        </div>

        <div className={`settings-content ${showSettings ? 'open' : ''}`}>
          <div className="row">
            <div><label className="small muted">Standaard</label><input type="number" value={settings.defaultBuyin} onChange={e => setSettings({ ...settings, defaultBuyin: e.target.value })} /></div>
            <div><label className="small muted">Afronden</label>
              <select value={settings.round} onChange={e => setSettings({ ...settings, round: e.target.value })}>
                <option value="0.01">0,01</option><option value="0.05">0,05</option><option value="1">1,00</option>
              </select>
            </div>
          </div>

          {/* Auto Balance Switch */}
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
            <span className="small muted">Auto-balance (afronding corrigeren)</span>
            <label className="pill" style={{ margin: 0, padding: '4px 12px', background: settings.autoBalance ? 'var(--success)' : 'var(--input-bg)', color: settings.autoBalance ? 'white' : 'var(--muted)', border: 'none' }}>
              <input type="checkbox" checked={settings.autoBalance} onChange={e => setSettings({ ...settings, autoBalance: e.target.checked })} style={{ display: 'none' }} />
              {settings.autoBalance ? 'AAN' : 'UIT'}
            </label>
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
            <button className="std" onClick={() => setPlayers(ps => ps.map(p => ({ ...p, buyin: settings.defaultBuyin })))}>Reset Inzet</button>
            <button className="std" onClick={() => setPlayers(ps => ps.map(p => ({ ...p, end: p.buyin })))}>Eind = Inzet</button>
          </div>

          {/* Import Presets */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <label className="small muted" style={{ display: 'block', marginBottom: '6px' }}>Spelerpresets importeren (komma-gescheiden)</label>
            <textarea rows={3} style={{ resize: 'vertical', marginBottom: '8px' }} placeholder="Julian, Bram, Max..." value={importText} onChange={e => setImportText(e.target.value)}></textarea>
            <button className="std" onClick={handleImportPresets}>Importeer spelerslijst</button>
          </div>
        </div>
      </div>

      {/* Main Panel: Chips & Add */}
      <div className="player-wrapper-card">
        <h3 style={{ marginBottom: '12px' }}>Spelers Kiezen</h3>
        <div className="chip-container">
          {presetList.map(name => (
            <PresetChip
              key={name}
              name={name}
              active={players.find(p => p.name.toLowerCase() === name.toLowerCase())}
              isExiting={exitingChips.has(name)}
              onClick={() => {
                const exists = players.find(p => p.name.toLowerCase() === name.toLowerCase());
                if (exists) triggerRemove(exists.id); else addPlayer(name);
              }}
              onDelete={removePreset}
            />
          ))}
          {presetList.length === 0 && <span className="small muted">Geen presets. Voeg naam toe hieronder.</span>}
        </div>
        <div className="add-player-row">
          <input className="add-player-input" id="customName" placeholder="Naam toevoegen..." onKeyDown={e => { if (e.key === 'Enter') { addPlayer(e.currentTarget.value); e.currentTarget.value = '' } }} />
          <button className="std add-player-btn" onClick={handlePaste}>Plak lijst</button>
          <button className="btn-solid-danger add-player-btn" onClick={handleClearAll} style={{ marginLeft: '8px' }}>Wis spelers</button>
        </div>
      </div>

      {/* Player List Cards Stack (Outside main panel) */}
      <div className="player-cards-container">
        {players.map(p => {
          const net = (parseNum(p.end) || 0) - (parseNum(p.buyin) || 0);

          return (
            <SwipeRow key={p.id} forceDelete={removingIds.has(p.id)} onDelete={() => removePlayer(p.id)}>
              {/* Internal Grid Layout */}
              <div className="player-card-flex">

                {/* Left: Name */}
                <div className="name-section" onClick={e => e.stopPropagation()}>
                  <input className="name-input" value={p.name} onClick={e => e.stopPropagation()} onChange={ev => updatePlayer(p.id, 'name', ev.target.value)} placeholder="Naam" />
                </div>

                {/* Right: Controls Column */}
                <div className="controls-section">

                  {/* Row 1: IN Label, Stepper, Result Pill */}
                  <div className="control-row" onClick={e => e.stopPropagation()}>
                    <div className="label-text">IN</div>
                    <div className="stepper-pill">
                      <button onClick={() => stepVal(p.id, 'buyin', -10)}>-</button>
                      <MoneyInput value={p.buyin} onChange={(v: string) => updatePlayer(p.id, 'buyin', v)} placeholder="0" />
                      <button onClick={() => stepVal(p.id, 'buyin', 10)}>+</button>
                    </div>
                    <ResultPill net={net} />
                  </div>

                  {/* Row 2: UIT Label, Stepper, AB Button */}
                  <div className="control-row" onClick={e => e.stopPropagation()}>
                    <div className="label-text">UIT</div>
                    <div className="stepper-pill">
                      <button onClick={() => stepVal(p.id, 'end', -10)}>-</button>
                      <MoneyInput value={p.end} onChange={(v: string) => updatePlayer(p.id, 'end', v)} placeholder="0" />
                      <button onClick={() => stepVal(p.id, 'end', 10)}>+</button>
                    </div>
                    <button className={`ab-button ${p.ab ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleAB(p.id); }} title="Auto-balance deelnemer">
                      <SparklesIcon />
                    </button>
                  </div>

                </div>
              </div>
            </SwipeRow>
          );
        })}
      </div>

      <div className="action-bar-static">
        <button className="action-btn" onClick={handleSaveSession}>Opslaan</button>
        <button className="action-btn primary" onClick={handleCalculate}>Bereken</button>
      </div>

      {result && (
        <div id="result-area" className="card" style={{ border: '1px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
            <h3>Resultaat</h3>
            <button className="pill" onClick={handleShare}>📤 Delen</button>
          </div>
          {autoBalanceInfo && <div className="small muted" style={{ marginBottom: '10px', fontStyle: 'italic' }}>{autoBalanceInfo}</div>}

          {result.transfers.length === 0 ? <p className="muted">Geen transacties.</p> : result.transfers.map((t: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{t.to}</span>
                <span className="muted" style={{ fontSize: '0.9rem' }}>krijgt van</span>
                <span style={{ fontWeight: 'bold', color: 'var(--danger)' }}>{t.from}</span>
              </div>
              <span style={{ fontWeight: 'bold' }}>{euro(t.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="toast-container">
          <div className={`toast success ${toastExiting ? 'exiting' : ''}`}>
            <span>✓ Avond opgeslagen!</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Stats({ showSearchModal, setShowSearchModal, isActive, dataVersion, onDataChanged }: { showSearchModal: boolean, setShowSearchModal: (v: boolean) => void, isActive: boolean, dataVersion: number, onDataChanged: () => void }) {
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [drilldownState, setDrilldownState] = useState<{ title: string, type: string } | null>(null);

  const [showAllCharts, setShowAllCharts] = useState(false);
  const [showAllLeaderboardModal, setShowAllLeaderboardModal] = useState(false);
  const [showAllPlayersInLeaderboard, setShowAllPlayersInLeaderboard] = useState(false); // Toggle for 3+ game filter
  const [showAllHistoryModal, setShowAllHistoryModal] = useState(false);
  const [showAllStatsModal, setShowAllStatsModal] = useState(false);
  const [showPotHistoryModal, setShowPotHistoryModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedPotSessionId, setExpandedPotSessionId] = useState<string | null>(null);

  // Cache invalidation - track which dataVersion we last loaded
  const lastLoadedVersion = useRef(-1);

  // Undo delete toast
  const [pendingDelete, setPendingDelete] = useState<{ id: string, session: any, timer: number } | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  // Search
  // State lifted to App, now receiving showSearchModal as prop
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState<{ players: boolean, sessions: boolean }>({ players: true, sessions: true });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search query - wait 300ms after typing stops before searching
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (showSearchModal) {
      // Multiple attempts to ensure focus on mobile after animation/mount
      const attemptFocus = () => {
        if (searchInputRef.current) searchInputRef.current.focus();
      };

      attemptFocus(); // Try immediately

      const timers = [
        setTimeout(attemptFocus, 50),
        setTimeout(attemptFocus, 150),
        setTimeout(attemptFocus, 450) // After animation
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      searchInputRef.current?.blur();
    }
  }, [showSearchModal]);

  // Filter state
  const [statsFilter, setStatsFilter] = useState<StatsFilterId>('all');
  const [customLastN, setCustomLastN] = useState<number>(12);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempCustomN, setTempCustomN] = useState<string>(''); // Changed to string for input control
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showFilterModal) {
      const attemptFocus = () => {
        if (filterInputRef.current) filterInputRef.current.focus();
      };

      attemptFocus(); // Try immediately

      const timers = [
        setTimeout(attemptFocus, 50),
        setTimeout(attemptFocus, 150),
        setTimeout(attemptFocus, 450) // After animation
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      filterInputRef.current?.blur();
    }
  }, [showFilterModal]);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [expandedPlayerSessionId, setExpandedPlayerSessionId] = useState<string | null>(null);

  // Main Chart refs
  const chartRef1 = useRef<HTMLCanvasElement>(null);
  const chartRef2 = useRef<HTMLCanvasElement>(null);
  const chartInst1 = useRef<any>(null);
  const chartInst2 = useRef<any>(null);

  const reload = async () => {
    try {
      const data = await getAllSessions();
      setAllSessions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error('Load error:', err);
      alert('Laden mislukt. Probeer de app opnieuw te openen.');
    } finally {
      setIsLoaded(true);
    }
  };
  useEffect(() => { reload(); lastLoadedVersion.current = dataVersion; }, []);

  // Reload data when switching to Stats view ONLY if data has changed
  useEffect(() => {
    if (isActive && dataVersion !== lastLoadedVersion.current) {
      reload();
      lastLoadedVersion.current = dataVersion;
    }
  }, [isActive, dataVersion]);

  // Compute filtered sessions
  const sessions = useMemo(() => {
    return filterSessionsForStats(allSessions, statsFilter, customLastN);
  }, [allSessions, statsFilter, customLastN]);

  // All-time player stats for Search
  const allTimePlayerStats = useMemo(() => {
    const map = new Map();
    allSessions.forEach(sess => {
      (sess.players || []).forEach((p: any) => {
        if (!map.has(p.name)) map.set(p.name, { name: p.name, total: 0, count: 0 });
        const s = map.get(p.name);
        s.count++;
        s.total += typeof p.net === 'number' ? p.net : ((parseNum(p.end) || 0) - (parseNum(p.buyin) || 0));
      });
    });
    return Array.from(map.values()).sort((a: any, b: any) => b.total - a.total);
  }, [allSessions]);

  const filterLabel = useMemo(() => {
    switch (statsFilter) {
      case 'last5': return "Gebaseerd op de laatste 5 avonden";
      case 'last10': return "Gebaseerd op de laatste 10 avonden";
      case 'thisYear': return "Gebaseerd op alle avonden dit jaar";
      case 'customLastN': return `Gebaseerd op de laatste ${customLastN} avonden`;
      default: return "Gebaseerd op alle avonden";
    }
  }, [statsFilter, customLastN]);

  const { stats, totalStake, globalStats, heatmapDots } = useMemo(() => {
    const map = new Map();
    let totStake = 0;

    let bestWin = { amount: 0, name: '', date: '', session: null };
    let worstLoss = { amount: 0, name: '', date: '', session: null };
    let bestStake = { amount: 0, date: '', session: null };
    let biggestTable = { count: 0, date: '', session: null };

    const sessionStakes: { date: string, amount: number }[] = [];

    sessions.forEach(sess => {
      const sessPlayers = sess.players || [];
      let sessStake = 0;

      if (sessPlayers.length > biggestTable.count) {
        biggestTable = { count: sessPlayers.length, date: sess.date, session: sess };
      }

      sessPlayers.forEach((p: any) => {
        const net = typeof p.net === 'number' ? p.net : ((parseNum(p.end) || 0) - (parseNum(p.buyin) || 0));
        const buy = parseNum(p.buyin) || 0;
        sessStake += buy;
        totStake += buy;

        if (!map.has(p.name)) map.set(p.name, { name: p.name, total: 0, count: 0, wins: 0, stake: 0, maxWin: -Infinity, maxLoss: Infinity, nets: [] });
        const s = map.get(p.name);
        s.total += net;
        s.stake += buy;
        s.count++;
        s.nets.push(net);
        if (net > 0) s.wins++;
        if (net > s.maxWin) s.maxWin = net;
        if (net < s.maxLoss) s.maxLoss = net;

        if (net > bestWin.amount) bestWin = { amount: net, name: p.name, date: sess.date, session: sess };
        if (net < worstLoss.amount) worstLoss = { amount: net, name: p.name, date: sess.date, session: sess };
      });

      if (sessStake > bestStake.amount) {
        bestStake = { amount: sessStake, date: sess.date, session: sess };
      }
      sessionStakes.push({ date: sess.date, amount: sessStake });
    });

    const playerStats = Array.from(map.values()).map((s: any) => {
      const avg = s.total / s.count;
      const variance = s.nets.reduce((a: number, n: number) => a + Math.pow(n - avg, 2), 0) / s.count;
      const totalIn = s.stake;
      const roi = totalIn > 0 ? (s.total / totalIn) * 100 : 0;
      const stdev = Math.sqrt(variance);

      // Consistency Score Calculation
      let consistencyScore = 0;
      if (s.count >= 3) {
        const normalizedVol = stdev / (Math.abs(avg) + 1);
        const sampleFactor = Math.min(1, Math.max(0.4, s.count / 10));
        consistencyScore = Math.round(100 * (1 / (1 + normalizedVol)) * sampleFactor);
      }

      return {
        ...s,
        avg,
        stdev,
        consistencyScore,
        winRate: Math.round((s.wins / s.count) * 100),
        maxWin: s.maxWin === -Infinity ? 0 : s.maxWin,
        maxLoss: s.maxLoss === Infinity ? 0 : s.maxLoss,
        totalIn,
        roi
      };
    }).sort((a: any, b: any) => b.total - a.total);

    let gs: any = {
      bestWin, worstLoss, bestStake, biggestTable,
      mostPlayed: null, bestAvg: null, mostVolatile: null, mostConsistent: null, bestROI: null
    };

    if (playerStats.length) {
      gs.mostPlayed = playerStats.reduce((prev, current) => (prev.count > current.count) ? prev : current);

      const regulars = playerStats.filter((p: any) => p.count >= 3);
      if (regulars.length > 0) {
        gs.bestAvg = regulars.reduce((prev: any, curr: any) => (curr.avg > prev.avg ? curr : prev), regulars[0]);
        gs.mostVolatile = regulars.reduce((prev: any, curr: any) => (curr.stdev > prev.stdev ? curr : prev), regulars[0]);
        gs.mostConsistent = regulars.reduce((prev: any, curr: any) => (curr.consistencyScore > prev.consistencyScore ? curr : prev), regulars[0]);
        const withROI = regulars.filter((p: any) => typeof p.roi === 'number' && p.totalIn > 0);
        if (withROI.length > 0) {
          gs.bestROI = withROI.reduce((prev: any, curr: any) => (curr.roi > prev.roi ? curr : prev), withROI[0]);
        }
      }
    }

    const maxSessStake = Math.max(...sessionStakes.map(s => s.amount), 1);
    const heatmapData = sessionStakes.reverse().map(s => ({
      ...s,
      intensity: s.amount / maxSessStake
    }));

    return { stats: playerStats, totalStake: totStake, globalStats: gs, heatmapDots: heatmapData };
  }, [sessions]);

  // Drilldown List Helper
  const getDrilldownList = () => {
    if (!drilldownState) return [];
    const type = drilldownState.type;
    let list = [...stats];
    switch (type) {
      case 'maxWin': return list.sort((a, b) => b.maxWin - a.maxWin);
      case 'maxLoss': return list.sort((a, b) => a.maxLoss - b.maxLoss);
      case 'stake': return list.sort((a, b) => b.totalIn - a.totalIn);
      case 'count': return list.sort((a, b) => b.count - a.count);
      case 'avg': return list.sort((a, b) => b.avg - a.avg);
      case 'swing': return list.sort((a, b) => b.stdev - a.stdev);
      case 'roi': return list.sort((a, b) => b.roi - a.roi);
      case 'consistency': return list.filter((p: any) => p.count >= 3).sort((a, b) => b.consistencyScore - a.consistencyScore);
      default: return list;
    }
  };

  const getDrilldownValue = (player: any) => {
    if (!drilldownState) return '';
    switch (drilldownState.type) {
      case 'maxWin': return euro(player.maxWin);
      case 'maxLoss': return euro(player.maxLoss);
      case 'stake': return euro(player.totalIn);
      case 'count': return `${player.count}x`;
      case 'avg': return euro(player.avg);
      case 'swing': return euro(player.stdev);
      case 'roi': return `${player.roi.toFixed(1)}%`;
      case 'consistency': return `${player.consistencyScore}/100`;
      default: return '';
    }
  };

  const getDrilldownClass = (player: any) => {
    if (!drilldownState) return '';
    if (['maxWin', 'avg', 'roi'].includes(drilldownState.type)) return player[drilldownState.type === 'maxWin' ? 'maxWin' : drilldownState.type] > 0 ? 'pos' : 'neg';
    if (drilldownState.type === 'maxLoss') return 'neg';
    return '';
  };

  const getDrilldownExplanation = () => {
    if (!drilldownState) return '';
    switch (drilldownState.type) {
      case 'maxWin': return 'De hoogste winst die elke speler ooit in één avond heeft behaald.';
      case 'maxLoss': return 'Het grootste verlies dat elke speler ooit in één avond heeft geleden.';
      case 'stake': return 'Het totale bedrag dat elke speler heeft ingezet over alle avonden.';
      case 'count': return 'Hoe vaak elke speler heeft meegespeeld.';
      case 'avg': return 'Het gemiddelde resultaat per avond (minimaal 3 avonden gespeeld).';
      case 'swing': return 'De standaarddeviatie - hoe wisselend de resultaten zijn (hoog = volatiel).';
      case 'roi': return 'Return on Investment - de winst als percentage van de totale inzet (minimaal 3 avonden).';
      case 'consistency': return 'Consistentiescore (0-100) gebaseerd op lage volatiliteit en veel avonden (minimaal 3).';
      default: return '';
    }
  };

  // Main Charts
  useEffect(() => {
    if (!(window as any).Chart || !chartRef1.current) return;
    const sessSorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const labels = sessSorted.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }));
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim();

    if (chartInst1.current) chartInst1.current.destroy();
    const data = sessSorted.map(s => (s.players || []).reduce((a: number, p: any) => a + (parseNum(p.buyin) || 0), 0));
    chartInst1.current = new (window as any).Chart(chartRef1.current, {
      type: 'bar', // Changed to Bar
      data: { labels, datasets: [{ label: 'Pot', data, backgroundColor: '#007aff', borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false, grid: { color: gridColor } },
          y: { beginAtZero: true, grid: { color: gridColor } }
        }
      }
    });

    if (chartRef2.current) {
      if (chartInst2.current) chartInst2.current.destroy();
      const top5 = stats.slice(0, 5);
      const datasets = top5.map((p: any, i: number) => {
        let cum = 0;
        const d = sessSorted.map(s => {
          const pl = (s.players || []).find((x: any) => x.name === p.name);
          cum += pl ? (typeof pl.net === 'number' ? pl.net : (parseNum(pl.end) - parseNum(pl.buyin))) : 0;
          return cum;
        });
        return { label: p.name, data: d, borderColor: `hsl(${i * 60}, 70%, 50%)`, borderWidth: 2, pointRadius: 0, tension: 0.4 }; // Smoother line
      });
      chartInst2.current = new (window as any).Chart(chartRef2.current, {
        type: 'line', data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 11 } } } },
          scales: {
            x: { display: false, grid: { color: gridColor } },
            y: { grid: { color: gridColor } }
          }
        }
      });
    }
  }, [sessions, stats]);

  const handleDelete = async (id: string, e: any) => {
    e.stopPropagation();

    // Find the session to delete
    const sessionToDelete = allSessions.find(s => s.sessionId === id);
    if (!sessionToDelete) return;

    // Cancel any existing pending delete
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer);
    }

    // Remove from UI immediately (optimistic update)
    setAllSessions(prev => prev.filter(s => s.sessionId !== id));
    if (selectedSession && selectedSession.sessionId === id) setSelectedSession(null);

    // Set up timer to actually delete after 4 seconds
    const timer = window.setTimeout(async () => {
      // Start exit animation
      setToastExiting(true);

      // Wait for animation then actually delete
      setTimeout(async () => {
        try {
          await deleteSessionFromDB(id);
          onDataChanged(); // Notify App that data changed
        } catch (err) {
          console.error('Delete error:', err);
          // Restore session on error
          setAllSessions(prev => [...prev, sessionToDelete].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          alert('Verwijderen mislukt. Probeer het opnieuw.');
        }
        setPendingDelete(null);
        setToastExiting(false);
      }, 250); // Match animation duration
    }, 4000);

    // Show toast with undo option
    setPendingDelete({ id, session: sessionToDelete, timer });
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;

    // Cancel the timer
    clearTimeout(pendingDelete.timer);

    // Restore the session
    setAllSessions(prev => [...prev, pendingDelete.session].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

    // Animate toast exit
    setToastExiting(true);
    setTimeout(() => {
      setPendingDelete(null);
      setToastExiting(false);
    }, 250);
  };
  const handleImport = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const d = JSON.parse(evt.target?.result as string);
        if (Array.isArray(d.sessions)) {
          for (const s of d.sessions) await saveSessionToDB(s);
          onDataChanged(); // Notify App that data changed
          reload();
          alert('Import gelukt!');
        } else {
          alert('Ongeldig bestandsformaat. Verwacht een backup bestand.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Import mislukt. Controleer of het bestand een geldige backup is.');
      }
    };
    reader.readAsText(file); e.target.value = '';
  };
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ sessions: allSessions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `poker_backup_${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
  };

  const handleScrollToCharts = () => {
    document.getElementById('trends-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpenPlayer = (playerName: string) => {
    const player = stats.find((s: any) => s.name === playerName);
    if (player) setSelectedPlayer(player);
  };

  // Leaderboard: Only show players with 3+ games for fairness
  const qualifiedStats = stats.filter((s: any) => s.count >= 3);
  const visibleLeaderboard = qualifiedStats.slice(0, 5);

  // Render History List
  const historyList = useMemo(() => {
    const list = sessions.slice(0, 3);
    return list.map(s => (
      <HistoryItem key={s.sessionId} session={s} expandedId={expandedSessionId} onToggle={setExpandedSessionId} onDelete={handleDelete} isPlayerView={false} />
    ));
  }, [sessions, expandedSessionId]);

  // Calculate specific history for selected player (always use filtered session list)
  const playerHistoryList = useMemo(() => {
    if (!selectedPlayer) return [];
    const list = sessions.filter(s => (s.players || []).some((p: any) => p.name === selectedPlayer.name))
      .map(s => {
        const p = (s.players || []).find((x: any) => x.name === selectedPlayer.name);
        return { ...s, playerNet: typeof p.net === 'number' ? p.net : (parseNum(p.end) - parseNum(p.buyin)) };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list.map(s => (
      <HistoryItem key={s.sessionId} session={s} expandedId={expandedPlayerSessionId} onToggle={setExpandedPlayerSessionId} onDelete={handleDelete} isPlayerView={true} />
    ));
  }, [sessions, selectedPlayer, expandedPlayerSessionId]);

  // Search Filtering (uses debounced query for smoother typing)
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery) return [];
    const q = debouncedSearchQuery.toLowerCase();
    let results: any[] = [];

    // Always filter across all-time unless filters are toggled off explicitly
    // Note: By default both filters are true.
    if (searchFilters.players) {
      const players = allTimePlayerStats.filter((p: any) => p.name.toLowerCase().includes(q));
      results = results.concat(players.map((p: any) => ({ ...p, type: 'player' })));
    }

    if (searchFilters.sessions) {
      const matchedSessions = allSessions.filter(s => matchSessionByQuery(q, s));
      results = results.concat(matchedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => ({ ...s, type: 'session' })));
    }

    return results;
  }, [debouncedSearchQuery, searchFilters, allTimePlayerStats, allSessions]);

  if (!isLoaded) return null;

  return (
    <div>
      <div className="small muted" style={{ marginTop: '-16px', marginBottom: '16px', fontSize: '0.85rem', paddingLeft: '4px', color: 'var(--muted)', fontWeight: 500 }}>{filterLabel}</div>
      <div className="filter-row-container">
        <button className={`glass-pill icon-only ${statsFilter === 'customLastN' ? 'active' : ''}`} onClick={() => { setTempCustomN(''); setShowFilterModal(true); }}>
          <FilterIcon />
        </button>
        <button className={`glass-pill ${statsFilter === 'all' ? 'active' : ''}`} onClick={() => setStatsFilter('all')}>Alles</button>
        <button className={`glass-pill ${statsFilter === 'last5' ? 'active' : ''}`} onClick={() => setStatsFilter('last5')}>Laatste 5</button>
        <button className={`glass-pill ${statsFilter === 'last10' ? 'active' : ''}`} onClick={() => setStatsFilter('last10')}>Laatste 10</button>
        <button className={`glass-pill ${statsFilter === 'thisYear' ? 'active' : ''}`} onClick={() => setStatsFilter('thisYear')}>Dit jaar</button>
      </div>

      {/* Fun Stats */}
      <div className="card">

        {sessions.length > 0 ? (
          <>
            <div className="stat-grid">
              <StatTile title="Pot Totaal" value={euro(totalStake)} onClick={() => setDrilldownState({ title: 'Totale inleg', type: 'stake' })} />
              <StatTile title="Avonden" value={sessions.length.toString()} />

              {globalStats.bestWin.amount > 0 && (
                <StatTile
                  title="🔥 Grootste winst"
                  value={euro(globalStats.bestWin.amount)}
                  subtitle={globalStats.bestWin.name}
                  tone="positive"
                  onClick={() => setDrilldownState({ title: 'Grootste winst', type: 'maxWin' })}
                />
              )}
              {globalStats.worstLoss.amount < 0 && (
                <StatTile
                  title="💣 Grootste verlies"
                  value={euro(globalStats.worstLoss.amount)}
                  subtitle={globalStats.worstLoss.name}
                  tone="negative"
                  onClick={() => setDrilldownState({ title: 'Grootste verlies', type: 'maxLoss' })}
                />
              )}
              {globalStats.bestStake.amount > 0 && (
                <StatTile
                  title="🏆 Hoogste inzet"
                  value={euro(globalStats.bestStake.amount)}
                  subtitle={new Date(globalStats.bestStake.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  onClick={() => setDrilldownState({ title: 'Totale inleg', type: 'stake' })}
                />
              )}
              {globalStats.mostPlayed && (
                <StatTile
                  title="👑 Meest gespeeld"
                  value={globalStats.mostPlayed.name}
                  subtitle={`${globalStats.mostPlayed.count}x`}
                  onClick={() => setDrilldownState({ title: 'Meest gespeeld', type: 'count' })}
                />
              )}

              {sessions.length > 1 && (
                <StatTile title="🔥 Inzet-intensiteit" value="" fullWidth>
                  <div className="heatmap-grid" style={{ marginTop: '8px' }}>
                    {heatmapDots.map((dot: any, i: number) => {
                      const color = `rgba(0, 122, 255, ${0.2 + (dot.intensity * 0.8)})`;
                      return <div key={i} className="heatmap-dot" style={{ backgroundColor: color }} title={`${new Date(dot.date).toLocaleDateString()}: ${euro(dot.amount)}`} />;
                    })}
                  </div>
                </StatTile>
              )}
            </div>
            <div className="card-footer">
              <button className="pill" style={{ background: 'transparent', border: '1px solid var(--line)' }} onClick={() => setShowAllStatsModal(true)}>Toon alle statistieken...</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🃏</div>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Nog geen avonden gespeeld</div>
            <div className="small muted">Sla je eerste pokeravond op via de rekenmachine!</div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ padding: '0 0 12px 0' }}>
        <div style={{ padding: '20px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Leaderboard</h3>
        </div>
        <div>
          {visibleLeaderboard.map((s: any, i: number) => (
            <div key={s.name} className="list-item" onClick={() => setSelectedPlayer(s)}>
              <div className={`list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
              <div className="list-content">
                <div className="list-title">{s.name}</div>
                <div className="list-sub">{s.count}x gespeeld</div>
              </div>
              <div className={`list-value ${s.total >= 0 ? 'pos' : 'neg'}`} style={{ paddingRight: '20px' }}>{euro(s.total)}</div>
            </div>
          ))}
          {(qualifiedStats.length > 5 || stats.length > qualifiedStats.length) && (
            <div className="card-footer" style={{ paddingTop: '0' }}>
              <button className="pill" onClick={() => setShowAllLeaderboardModal(true)}>Toon alles ({stats.length})</button>
            </div>
          )}
          {qualifiedStats.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏆</div>
              <div className="small muted">Speel minimaal 3 avonden om op het leaderboard te komen!</div>
            </div>
          )}
        </div>
      </div>

      {/* Graphs */}
      <div className="card" id="trends-section">
        <h3>Trends</h3>
        <div style={{ height: '180px', position: 'relative' }}><canvas ref={chartRef1}></canvas></div>
        <div style={{ height: '180px', position: 'relative', marginTop: '24px' }}><canvas ref={chartRef2}></canvas></div>
        <div className="card-footer">
          <button className="pill" onClick={() => setShowAllCharts(true)}>Toon alle grafieken...</button>
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3>Geschiedenis</h3>
          <div>
            <button className="pill" onClick={handleExport}>Backup</button>
            <label className="pill" style={{ marginLeft: '6px' }}>Import<input type="file" onChange={handleImport} accept=".json" style={{ display: 'none' }} /></label>
          </div>
        </div>

        {historyList}

        {sessions.length > 3 && (
          <div className="card-footer" style={{ paddingTop: '0' }}>
            <button className="pill" onClick={() => setShowAllHistoryModal(true)}>Toon alles ({sessions.length})</button>
          </div>
        )}
      </div>

      {/* Note: Floating Search Button removed, handled by MorphingFab in App */}

      {/* --- MODALS --- */}

      {/* Search Modal */}
      <GlassModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Zoeken"
        subtitle={filterLabel}
        headerContent={
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                className={`pill ${searchFilters.players ? 'active' : ''}`}
                onClick={() => setSearchFilters(f => ({ ...f, players: !f.players }))}
              >
                Spelers
              </button>
              <button
                className={`pill ${searchFilters.sessions ? 'active' : ''}`}
                onClick={() => setSearchFilters(f => ({ ...f, sessions: !f.sessions }))}
              >
                Avonden
              </button>
            </div>
            <input
              ref={searchInputRef}
              className="std"
              placeholder="Zoek..."
              inputMode="search"
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </>
        }
      >
        {(!searchFilters.players && !searchFilters.sessions) ? (
          <div className="small muted" style={{ textAlign: 'center', marginTop: '20px' }}>Selecteer Spelers of Avonden om te zoeken.</div>
        ) : searchResults.length > 0 ? (
          <div>
            {searchResults.filter(r => r.type === 'player').length > 0 && (
              <>
                <h4 style={{ marginTop: '12px', marginBottom: '4px' }}>Spelers</h4>
                {searchResults.filter(r => r.type === 'player').map((p: any) => (
                  <div key={p.name} className="list-item" onClick={() => {
                    const currentPlayer = stats.find((s: any) => s.name === p.name) || p;
                    setSelectedPlayer(currentPlayer);
                  }}>
                    <div className="list-content">
                      <div className="list-title">{p.name}</div>
                      <div className="list-sub">{p.count}x gespeeld (totaal)</div>
                    </div>
                    <div className={`list-value ${p.total >= 0 ? 'pos' : 'neg'}`} style={{ paddingRight: '20px' }}>{euro(p.total)}</div>
                  </div>
                ))}
              </>
            )}

            {searchResults.filter(r => r.type === 'session').length > 0 && (
              <>
                <h4 style={{ marginTop: '24px', marginBottom: '4px' }}>Avonden</h4>
                {searchResults.filter(r => r.type === 'session').map((s: any) => (
                  <div key={s.sessionId} className="list-item" onClick={() => { setSelectedSession(s); }}>
                    <div className="list-content">
                      <div className="list-title">{new Date(s.date).toLocaleDateString()}</div>
                      <div className="list-sub">{(s.players || []).map((p: any) => p.name).join(', ')}</div>
                    </div>
                    <div className="list-value" style={{ fontSize: '0.9rem', color: 'var(--muted)', fontWeight: 500 }}>{s.desc}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        ) : (
          <div className="small muted" style={{ textAlign: 'center', marginTop: '20px' }}>
            {searchQuery ? 'Geen resultaten gevonden.' : 'Typ om te zoeken.'}
          </div>
        )}
      </GlassModal>

      {/* Custom Filter Modal */}
      <GlassModal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter aanpassen" zIndex={3100}>
        <div style={{ paddingBottom: '20px', minHeight: '40vh' }}>
          <p className="small muted" style={{ marginBottom: '12px' }}>Toon statistieken voor de laatste X avonden:</p>
          <input
            ref={filterInputRef}
            type="number"
            pattern="[0-9]*"
            inputMode="numeric"
            className="std"
            value={tempCustomN}
            onChange={(e) => setTempCustomN(e.target.value)}
            placeholder={String(customLastN)}
            autoFocus
            style={{ fontSize: '1.2rem', textAlign: 'center' }}
          />
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button className="std" onClick={() => setShowFilterModal(false)}>Annuleer</button>
            <button className="std" style={{ background: 'var(--accent)', color: 'white', border: 'none' }} onClick={() => {
              const n = parseInt(tempCustomN);
              if (!isNaN(n) && n > 0) {
                setCustomLastN(n);
                setStatsFilter('customLastN');
              }
              setShowFilterModal(false);
            }}>Bevestig</button>
          </div>
        </div>
      </GlassModal>

      {/* All Stats Modal */}
      <GlassModal isOpen={showAllStatsModal} onClose={() => setShowAllStatsModal(false)} title="Alle statistieken" subtitle={filterLabel}>
        <div className="stat-grid">
          <StatTile title="Pot Totaal" value={euro(totalStake)} onClick={() => { setDrilldownState({ title: 'Totale inleg', type: 'stake' }); }} />
          <StatTile title="Avonden" value={sessions.length.toString()} />

          {globalStats.bestWin.amount > 0 && <StatTile title="🔥 Grootste winst" value={euro(globalStats.bestWin.amount)} subtitle={globalStats.bestWin.name} tone="positive" onClick={() => { setDrilldownState({ title: 'Grootste winst', type: 'maxWin' }); }} />}
          {globalStats.worstLoss.amount < 0 && <StatTile title="💣 Grootste verlies" value={euro(globalStats.worstLoss.amount)} subtitle={globalStats.worstLoss.name} tone="negative" onClick={() => { setDrilldownState({ title: 'Grootste verlies', type: 'maxLoss' }); }} />}

          {globalStats.bestStake.amount > 0 && <StatTile title="🏆 Hoogste inzet" value={euro(globalStats.bestStake.amount)} subtitle={new Date(globalStats.bestStake.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} onClick={() => { setDrilldownState({ title: 'Totale inleg', type: 'stake' }); }} />}

          {globalStats.mostPlayed && <StatTile title="👑 Meest gespeeld" value={globalStats.mostPlayed.name} subtitle={`${globalStats.mostPlayed.count}x`} onClick={() => { setDrilldownState({ title: 'Meest gespeeld', type: 'count' }); }} />}

          {globalStats.bestAvg && <StatTile title="📈 Beste gem." value={euro(globalStats.bestAvg.avg)} subtitle={globalStats.bestAvg.name} onClick={() => { setDrilldownState({ title: 'Beste gemiddelde', type: 'avg' }); }} />}

          {globalStats.bestROI && <StatTile title="💰 Beste ROI" value={`${globalStats.bestROI.roi.toFixed(1)}%`} subtitle={globalStats.bestROI.name} tone={globalStats.bestROI.roi > 0 ? 'positive' : 'negative'} onClick={() => { setDrilldownState({ title: 'ROI ranking', type: 'roi' }); }} />}

          {globalStats.mostVolatile && <StatTile title="🎢 Swing" value={euro(globalStats.mostVolatile.stdev)} subtitle={`${globalStats.mostVolatile.name} (SD)`} onClick={() => { setDrilldownState({ title: 'Swing (Volatiliteit)', type: 'swing' }); }} />}

          <StatTile title="🎲 Gem. pot" value={euro(sessions.length > 0 ? totalStake / sessions.length : 0)} subtitle="per avond" onClick={() => { setShowPotHistoryModal(true); }} />

          {globalStats.biggestTable.count > 0 && <StatTile title="👥 Grootste tafel" value={globalStats.biggestTable.count} subtitle="spelers" onClick={() => { setSelectedSession(globalStats.biggestTable.session); }} />}

          {/* Consistency Stat */}
          <StatTile
            title="📏 Meest consistent"
            value={globalStats.mostConsistent ? globalStats.mostConsistent.name : '–'}
            subtitle={globalStats.mostConsistent ? `${globalStats.mostConsistent.consistencyScore}/100` : 'Te weinig data'}
            onClick={() => { setDrilldownState({ title: 'Consistentie ranking', type: 'consistency' }); }}
          />
        </div>
      </GlassModal>

      {/* Drilldown Modal (Stacked) */}
      <GlassModal isOpen={!!drilldownState} onClose={() => setDrilldownState(null)} title={drilldownState?.title || ''} subtitle={filterLabel} zIndex={3100}>
        {getDrilldownExplanation() && (
          <div className="small muted" style={{ marginBottom: '16px', padding: '12px', background: 'var(--input-bg)', borderRadius: '12px' }}>
            {getDrilldownExplanation()}
          </div>
        )}
        {getDrilldownList().map((p: any, i: number) => (
          <div key={p.name} className="list-item" onClick={() => { setSelectedPlayer(p); }}>
            <div className="list-rank">{i + 1}</div>
            <div className="list-content">
              <div className="list-title">{p.name}</div>
              <div className="list-sub">{p.count}x gespeeld</div>
            </div>
            <div className={`list-value ${getDrilldownClass(p)}`} style={{ paddingRight: '20px' }}>
              {getDrilldownValue(p)}
            </div>
          </div>
        ))}
      </GlassModal>

      {/* Session Detail Modal (Stacked) */}
      <GlassModal isOpen={!!selectedSession} onClose={() => setSelectedSession(null)} title="Avond details" zIndex={3100}>
        {selectedSession && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{new Date(selectedSession.date).toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div className="muted">{selectedSession.desc}</div>
            </div>
            <HistoryItem session={selectedSession} expandedId={null} onToggle={() => { }} onDelete={handleDelete} isPlayerView={false} forceOpen={true} />
          </>
        )}
      </GlassModal>

      {/* Player Modal (Stacked) */}
      <GlassModal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} title={selectedPlayer?.name || 'Speler'} zIndex={3200}>
        {selectedPlayer && (
          <>
            <div className="stat-grid">
              <StatTile title="Winst" value={selectedPlayer.total ? euro(selectedPlayer.total) : '€ 0,00'} tone={(selectedPlayer.total || 0) >= 0 ? 'positive' : 'negative'} />
              <StatTile title="Win %" value={`${selectedPlayer.winRate || 0}%`} />
              <StatTile title="Max Winst" value={euro(selectedPlayer.maxWin || 0)} tone="positive" />
              <StatTile title="Max Verlies" value={euro(selectedPlayer.maxLoss || 0)} tone="negative" />
              <StatTile title="Gemiddeld" value={euro(selectedPlayer.avg || 0)} />
              <StatTile title="Volatiliteit (SD)" value={euro(selectedPlayer.stdev || 0)} />
              <StatTile title="ROI" value={!selectedPlayer.roi ? '—' : selectedPlayer.roi.toFixed(1) + '%'} tone={(selectedPlayer.roi || 0) > 0 ? 'positive' : (selectedPlayer.roi || 0) < 0 ? 'negative' : 'default'} />
              <StatTile title="Totale inleg" value={euro(selectedPlayer.totalIn || 0)} />
            </div>

            <div style={{ marginTop: '24px' }}>
              <div className="small muted">Cumulatieve winst</div>
              <PlayerDetailChart sessions={sessions} player={selectedPlayer} />
            </div>

            <h3 style={{ marginTop: '24px' }}>Gespeelde Avonden</h3>
            <div>
              {playerHistoryList}
            </div>
          </>
        )}
      </GlassModal>

      {/* All Leaderboard Modal */}
      <GlassModal
        isOpen={showAllLeaderboardModal}
        onClose={() => setShowAllLeaderboardModal(false)}
        title="Leaderboard"
        subtitle={showAllPlayersInLeaderboard ? "Alle spelers" : "Min. 3x gespeeld"}
        headerButtons={
          <button
            className="glass-close-btn"
            onClick={() => setShowAllPlayersInLeaderboard(!showAllPlayersInLeaderboard)}
            style={{ opacity: showAllPlayersInLeaderboard ? 1 : 0.5 }}
            title={showAllPlayersInLeaderboard ? "Toon alleen gekwalificeerde spelers" : "Toon alle spelers"}
          >
            👁️
          </button>
        }
      >
        {(showAllPlayersInLeaderboard ? stats : qualifiedStats).map((s: any, i: number) => (
          <div key={s.name} className="list-item" onClick={() => { setSelectedPlayer(s); }}>
            <div className={`list-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
            <div className="list-content">
              <div className="list-title">{s.name}</div>
              <div className="list-sub">{s.count}x gespeeld</div>
            </div>
            <div className={`list-value ${s.total >= 0 ? 'pos' : 'neg'}`} style={{ paddingRight: '20px' }}>{euro(s.total)}</div>
          </div>
        ))}
      </GlassModal>

      {/* All History Modal */}
      <GlassModal isOpen={showAllHistoryModal} onClose={() => setShowAllHistoryModal(false)} title="Alle Avonden" subtitle={filterLabel}>
        {sessions.map(s => (
          <HistoryItem key={s.sessionId} session={s} expandedId={expandedSessionId} onToggle={setExpandedSessionId} onDelete={handleDelete} isPlayerView={false} />
        ))}
      </GlassModal>

      {/* All Charts Modal */}
      <GlassModal isOpen={showAllCharts} onClose={() => setShowAllCharts(false)} title="Alle Grafieken" subtitle={filterLabel}>
        <OverlayCharts sessions={sessions} stats={stats} />
      </GlassModal>

      {/* Pot History Modal */}
      <GlassModal isOpen={showPotHistoryModal} onClose={() => setShowPotHistoryModal(false)} title="Pot per avond" subtitle={filterLabel}>
        <div className="small muted" style={{ marginBottom: '16px', padding: '12px', background: 'var(--input-bg)', borderRadius: '12px' }}>
          De totale pot per avond (som van alle inzetten). Tik op een avond om de details te zien.
        </div>
        {sessions.map(s => {
          const sessionPot = (s.players || []).reduce((a: number, p: any) => a + (parseNum(p.buyin) || 0), 0);
          const isExpanded = expandedPotSessionId === s.sessionId;
          return (
            <div key={s.sessionId} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setExpandedPotSessionId(isExpanded ? null : s.sessionId)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{new Date(s.date).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--fg)', paddingRight: '8px' }}>{euro(sessionPot)}</div>
              </div>
              {!isExpanded && (
                <div className="small muted" style={{ marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {(s.players || []).map((p: any) => p.name).join(', ')}
                </div>
              )}
              <div className={`history-accordion ${isExpanded ? 'open' : ''}`}>
                <div className="history-accordion-inner" onClick={e => e.stopPropagation()}>
                  <div className="history-details">
                    <div className="history-grid-row" style={{ borderBottom: '1px solid var(--line)' }}>
                      <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Naam</div>
                      <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>In</div>
                      <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Uit</div>
                      <div className="history-col" style={{ fontWeight: 700, color: 'var(--muted)' }}>Res</div>
                    </div>
                    {(s.players || []).map((p: any, i: number) => {
                      const pNet = typeof p.net === 'number' ? p.net : (p.end - p.buyin);
                      return (
                        <div key={i} className="history-grid-row">
                          <div className="history-col">{p.name}</div>
                          <div className="history-col" style={{ color: 'var(--muted)' }}>{euro(p.buyin)}</div>
                          <div className="history-col" style={{ color: 'var(--muted)' }}>{euro(p.end)}</div>
                          <div className="history-col" style={{ fontWeight: 600, color: pNet >= 0.005 ? 'var(--success)' : pNet <= -0.005 ? 'var(--danger)' : 'var(--fg)' }}>
                            {euro(pNet)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </GlassModal>

      {/* Undo Delete Toast */}
      {pendingDelete && (
        <div className="toast-container">
          <div className={`toast ${toastExiting ? 'exiting' : ''}`}>
            <span>Avond verwijderd</span>
            <button className="toast-btn" onClick={handleUndoDelete}>Ongedaan maken</button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);