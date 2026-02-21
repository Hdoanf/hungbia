import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './index.css';

// --- Configuration ---
const GRID_SIZE = 4; // 4x4 = 16 pieces
const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
// Sửa lỗi đường dẫn ảnh cho GitHub Pages: sử dụng đường dẫn tương đối
const HIDDEN_IMAGE = "anh-cua-toi.jpg"; 

// --- Types ---
interface Item {
  id: number;
  x: number;
  y: number;
  type: 'beer' | 'wine' | 'bomb';
  speed: number;
}

const App: React.FC = () => {
  const [score, setScore] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [basketX, setBasketX] = useState(window.innerWidth / 2);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [unlockedPieces, setUnlockedPieces] = useState<number[]>([]);
  const [gameWon, setGameWon] = useState(false);

  const nextId = useRef(0);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());

  // Support both Mouse and Touch for Mobile
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
      } else {
        clientX = e.clientX;
      }
      setBasketX(clientX);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchstart', handleMove, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchstart', handleMove);
    };
  }, []);

  // Unlock piece logic
  const unlockRandomPieces = useCallback((count: number) => {
    setUnlockedPieces(prev => {
      const remaining_A = []; // Pieces 4-15
      const remaining_B = []; // Top 4 pieces (0,1,2,3)
      
      for (let i = 0; i < TOTAL_PIECES; i++) {
        if (!prev.includes(i)) {
          if (i < 4) remaining_B.push(i);
          else remaining_A.push(i);
        }
      }
      
      if (remaining_A.length === 0 && remaining_B.length === 0) return prev;

      const toUnlock = [...prev];
      const pool = remaining_A.length > 0 ? remaining_A : remaining_B;
      const itemsToUnlock = pool.sort(() => Math.random() - 0.5).slice(0, count);
      return [...toUnlock, ...itemsToUnlock];
    });
  }, []);

  // Check for Win
  useEffect(() => {
    if (unlockedPieces.length === TOTAL_PIECES && !gameWon && gameStarted) {
      // Bắn pháo hoa ngay lập tức
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      
      // Đợi 2 giây mới hiện màn hình thông báo thắng cuộc
      const timer = setTimeout(() => {
        setGameWon(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [unlockedPieces, gameWon, gameStarted]);

  // Main Game Loop
  const update = useCallback(() => {
    const now = Date.now();
    const dt = (now - lastTimeRef.current) / 1000;
    lastTimeRef.current = now;

    if (gameStarted && !gameOver && !gameWon) {
      setItems(prev => {
        const next: Item[] = [];
        const isMobile = window.innerWidth < 600;
        const basketWidth = isMobile ? 100 : 150;
        const bL = basketX - basketWidth / 2;
        const bR = basketX + basketWidth / 2;
        const bT = window.innerHeight - 100;

        for (const it of prev) {
          const newY = it.y + it.speed * (isMobile ? 350 : 500) * dt;
          const xPx = (it.x * window.innerWidth) / 100;

          if (newY > bT && newY < bT + 60 && xPx > bL && xPx < bR) {
            if (it.type === 'beer') {
              setScore(s => s + 10);
              unlockRandomPieces(1);
              confetti({ particleCount: 10, spread: 30, origin: { x: basketX / window.innerWidth, y: 0.9 }, colors: ['#f1c40f', '#ffffff'] });
            } else if (it.type === 'wine') {
              setScore(s => s + 50);
              unlockRandomPieces(3);
              confetti({ particleCount: 25, spread: 50, origin: { x: basketX / window.innerWidth, y: 0.9 }, colors: ['#e74c3c', '#ffffff'] });
            } else if (it.type === 'bomb') {
              setLives(l => {
                  const newLives = l - 1;
                  if (newLives <= 0) setGameOver(true);
                  return newLives;
              });
            }
            continue;
          }

          if (newY < window.innerHeight + 100) {
            next.push({ ...it, y: newY });
          }
        }
        return next;
      });
    }
    requestRef.current = requestAnimationFrame(update);
  }, [gameStarted, gameOver, gameWon, basketX, unlockRandomPieces]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update]);

  // Spawning
  useEffect(() => {
    if (!gameStarted || gameOver || gameWon) return;
    const interval = setInterval(() => {
      const types: ('beer' | 'wine' | 'bomb')[] = ['beer', 'beer', 'beer', 'wine', 'bomb', 'bomb', 'bomb'];
      const newItem: Item = {
        id: nextId.current++,
        x: 10 + Math.random() * 80,
        y: -100,
        type: types[Math.floor(Math.random() * types.length)],
        speed: 1.0 + Math.random() * 1.5 + (score / 3000),
      };
      setItems(prev => [...prev, newItem]);
    }, window.innerWidth < 600 ? 800 : 600);
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, gameWon, score]);

  const restartGame = () => {
    setScore(0); setItems([]); setLives(3); setGameOver(false); setGameWon(false); setUnlockedPieces([]); setGameStarted(true);
  };

  return (
    <div className="game-container">
      <div className="hud">
        <div className="stat-item gold-glow">🍺 {score}</div>
        <div className="stat-item red-glow">{'❤️'.repeat(lives)}</div>
        <div className="stat-item blue-glow">🔓 {unlockedPieces.length}/16</div>
      </div>

      <div className="puzzle-container">
        <div className="image-wrapper">
          <img src={HIDDEN_IMAGE} alt="Secret" className="base-image" />
          <div className="grid-overlay">
            {Array.from({ length: TOTAL_PIECES }).map((_, i) => (
              <div key={i} className={`grid-piece ${unlockedPieces.includes(i) ? 'unlocked' : ''}`}>
                {!unlockedPieces.includes(i) && <span>🍺</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!gameStarted && !gameOver && !gameWon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overlay-screen">
            <h1 className="title-shine">HỨNG BIA 🍺</h1>
            <button onClick={() => setGameStarted(true)} className="play-btn">CHƠI NGAY 🎮</button>
            <p className="hint">Vuốt để hứng bia. Né bom 💣!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {gameOver && (
        <div className="overlay-screen game-over">
          <h1>THUA RỒI 😵</h1>
          <button onClick={restartGame} className="play-btn">LẠI 🔄</button>
        </div>
      )}

      {gameWon && (
        <div className="overlay-screen game-won">
          <h1>THẮNG RỒI! 🎉</h1>
          <button onClick={restartGame} className="play-btn">CHƠI TIẾP 🔄</button>
        </div>
      )}

      {gameStarted && !gameOver && !gameWon && (
        <motion.div
          animate={{ x: basketX }}
          transition={{ type: "spring", stiffness: 800, damping: 45 }}
          className="basket"
          style={{ translateX: "-50%" }}
        >
          <div className="basket-icon">📦</div>
        </motion.div>
      )}

      <div className="items-layer">
        {items.map(it => (
          <div key={it.id} className="falling-item" style={{ left: `${it.x}vw`, top: it.y }}>
            {it.type === 'beer' ? '🍺' : it.type === 'wine' ? '🍾' : '💣'}
          </div>
        ))}
      </div>

      <style>{`
        :root { --gold: #f1c40f; --red: #e74c3c; --dark: #1a1a2e; }
        body { margin: 0; padding: 0; overflow: hidden; background: var(--dark); font-family: sans-serif; touch-action: none; }
        .game-container { width: 100vw; height: 100vh; position: relative; touch-action: none; }
        .hud { position: absolute; top: 10px; width: 100%; display: flex; justify-content: center; gap: 20px; z-index: 100; font-size: 1.2rem; font-weight: bold; pointer-events: none; }
        .gold-glow { color: var(--gold); } .red-glow { color: #ff3e3e; } .blue-glow { color: #3498db; }
        .puzzle-container { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: min(90vw, 400px); height: min(90vw, 400px); border: 5px solid var(--gold); background: #000; z-index: 10; overflow: hidden; }
        .image-wrapper, .base-image { width: 100%; height: 100%; object-fit: cover; }
        .grid-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); }
        .grid-piece { background: #222; border: 0.5px solid #333; display: flex; align-items: center; justify-content: center; font-size: 1rem; transition: all 0.5s; }
        .grid-piece.unlocked { opacity: 0; transform: scale(0.5); }
        .overlay-screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 200; background: rgba(26,26,46,0.95); text-align: center; color: white; padding: 20px; }
        .title-shine { font-size: 3rem; color: var(--gold); margin-bottom: 20px; }
        .play-btn { padding: 15px 40px; font-size: 1.5rem; background: var(--gold); border: none; border-radius: 30px; font-weight: bold; }
        .basket { position: absolute; bottom: 40px; width: 100px; height: 30px; background: #8e44ad; border-radius: 8px; border: 2px solid var(--gold); z-index: 150; }
        .basket-icon { font-size: 35px; transform: translateY(-30px); text-align: center; }
        .items-layer { position: absolute; inset: 0; pointer-events: none; }
        .falling-item { position: absolute; font-size: 35px; transform: translateX(-50%); }
        @media (min-width: 600px) {
          .hud { font-size: 2rem; gap: 60px; }
          .puzzle-container { width: 500px; height: 500px; }
          .basket { width: 150px; }
          .basket-icon { font-size: 50px; }
          .falling-item { font-size: 50px; }
        }
      `}</style>
    </div>
  );
};

export default App;
