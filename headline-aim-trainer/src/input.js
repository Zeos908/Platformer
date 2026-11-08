// Mouse and keyboard. Uses pointer lock with raw (unaccelerated) input when the
// browser supports it. If pointer lock is refused (some embedded frames), it
// falls back to reading mouse movement over the canvas.

export class Input {
  constructor(target) {
    this.target = target;
    this.dx = 0;
    this.dy = 0;
    this.lookDX = 0;
    this.lookDY = 0;
    this.fire = false;
    this.ads = false;
    this.zoomClicks = 0;
    this.active = false;
    this.locked = false;
    this.freeMode = false;
    this.raw = false;
    this.lockWorked = false;
    this.ignoreNext = 0;
    this.onKey = null;
    this.onUnlock = null;

    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.target;
      if (this.locked) {
        this.lockWorked = true;
        this.ignoreNext = 2;
      }
      if (was && !this.locked) {
        this.fire = false;
        this.ads = false;
        this.onUnlock?.();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.active || !(this.locked || this.freeMode)) return;
      if (this.ignoreNext > 0) { this.ignoreNext--; return; }
      // Some browsers report a huge jump on the first locked event.
      if (Math.abs(e.movementX) > 900 || Math.abs(e.movementY) > 900) return;
      this.dx += e.movementX;
      this.dy += e.movementY;
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.active || !(this.locked || (this.freeMode && e.target === this.target))) return;
      if (e.button === 0) this.fire = true;
      if (e.button === 2) {
        this.ads = true;
        this.zoomClicks++;
      }
      e.preventDefault();
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.fire = false;
      if (e.button === 2) this.ads = false;
    });
    document.addEventListener('contextmenu', (e) => {
      if (this.active) e.preventDefault();
    });
    window.addEventListener('blur', () => {
      this.fire = false;
      this.ads = false;
    });
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.onKey?.(e);
    });
  }

  /** Request pointer lock. Resolves to 'locked', 'free' or 'retry'. */
  async lock() {
    const el = this.target;
    if (!el.requestPointerLock) return this.enterFree();
    const attempt = async (opts) => {
      const r = opts ? el.requestPointerLock(opts) : el.requestPointerLock();
      if (r && typeof r.then === 'function') await r;
      else await waitForLock(el);
    };
    try {
      await attempt({ unadjustedMovement: true });
      this.raw = true;
      return 'locked';
    } catch (err) {
      try {
        await attempt();
        this.raw = false;
        return 'locked';
      } catch (err2) {
        // After an Esc the browser blocks re-locking for about a second.
        if (this.lockWorked) return 'retry';
        return this.enterFree();
      }
    }
  }

  enterFree() {
    this.freeMode = true;
    document.body.classList.add('free-aim');
    return 'free';
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Right-click presses since the last call (the sniper cycles zoom on each). */
  takeZoomClicks() {
    const n = this.zoomClicks;
    this.zoomClicks = 0;
    return n;
  }

  /** Mouse delta since the last call. */
  consume() {
    const d = { dx: this.dx, dy: this.dy };
    this.lookDX = this.dx;
    this.lookDY = this.dy;
    this.dx = 0;
    this.dy = 0;
    return d;
  }
}

function waitForLock(el) {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); document.pointerLockElement === el ? resolve() : reject(new Error('lock failed')); };
    const fail = () => { cleanup(); reject(new Error('lock error')); };
    const cleanup = () => {
      document.removeEventListener('pointerlockchange', done);
      document.removeEventListener('pointerlockerror', fail);
      clearTimeout(timer);
    };
    document.addEventListener('pointerlockchange', done);
    document.addEventListener('pointerlockerror', fail);
    const timer = setTimeout(fail, 1500);
  });
}
