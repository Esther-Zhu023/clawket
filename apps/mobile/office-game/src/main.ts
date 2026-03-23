// Office game bootstrap and main loop

import { loadSpriteSheets } from './sprite-sheet';
import { postToRN } from './bridge';
import { initRenderer, render } from './renderer';
import { updateCharacter, type Character } from './character';
import { initBridge } from './bridge';
import { initBubbleScheduler, updateBubbleScheduler } from './bubble-scheduler';
import { updateInteractions } from './character-interactions';

const TARGET_FPS = 15;
const FRAME_TIME = 1000 / TARGET_FPS;
const MAX_FRAME_DELTA_MS = 250;
const MAX_CATCH_UP_STEPS = 5;

let characters: Character[] = [];
let lastTime = 0;
let accumulator = 0;

function gameLoop(timestamp: number): void {
  requestAnimationFrame(gameLoop);

  const dt = Math.min(timestamp - lastTime, MAX_FRAME_DELTA_MS);
  lastTime = timestamp;
  accumulator += dt;

  // Fixed timestep at TARGET_FPS
  if (accumulator < FRAME_TIME) return;

  const stepDt = FRAME_TIME / 1000; // seconds
  let steps = 0;
  while (accumulator >= FRAME_TIME && steps < MAX_CATCH_UP_STEPS) {
    for (const c of characters) {
      updateCharacter(c, stepDt);
    }
    updateBubbleScheduler(stepDt, characters);
    updateInteractions(characters, stepDt);
    accumulator -= FRAME_TIME;
    steps += 1;
  }

  // Drop excessive backlog instead of blocking the UI thread trying to "catch up"
  // after the WebView was paused by a gesture, tab switch, or backgrounding.
  if (steps === MAX_CATCH_UP_STEPS && accumulator >= FRAME_TIME) {
    accumulator = 0;
  }

  render(characters);
}

async function init(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element not found');

  await loadSpriteSheets();
  initRenderer(canvas);


  characters = initBridge((updated) => { characters = updated; });
  for (const c of characters) {
    updateCharacter(c, 0);
  }
  initBubbleScheduler();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

void init().catch((error) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error('Office init failed:', error);
  postToRN({ type: 'OFFICE_DEBUG', message: `init failed: ${message}` });
});
