const BLOCKED = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  let mouseDX = 0;
  let mouseDY = 0;
  let locked = false;
  let dragging = false;
  let onLock = null;

  window.addEventListener('keydown', (event) => {
    if (BLOCKED.has(event.code)) event.preventDefault();
    if (!down.has(event.code)) pressed.add(event.code);
    down.add(event.code);
  });

  window.addEventListener('keyup', (event) => {
    down.delete(event.code);
  });

  window.addEventListener('blur', () => {
    down.clear();
    dragging = false;
  });

  window.addEventListener('mousemove', (event) => {
    if (locked || dragging) {
      mouseDX += event.movementX || 0;
      mouseDY += event.movementY || 0;
    }
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) dragging = true;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });

  canvas.addEventListener('click', () => {
    if (!locked && canvas.requestPointerLock) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    if (onLock) onLock(locked);
  });

  function isDown(code) {
    return down.has(code);
  }

  function wasPressed(code) {
    return pressed.has(code);
  }

  function takeMouse() {
    const out = { dx: mouseDX, dy: mouseDY };
    mouseDX = 0;
    mouseDY = 0;
    return out;
  }

  function moveAxis() {
    return {
      x: (isDown('KeyD') ? 1 : 0) - (isDown('KeyA') ? 1 : 0),
      z: (isDown('KeyW') ? 1 : 0) - (isDown('KeyS') ? 1 : 0),
    };
  }

  function endFrame() {
    pressed.clear();
  }

  function lock() {
    if (!locked && canvas.requestPointerLock) canvas.requestPointerLock();
  }

  function unlock() {
    if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
  }

  return {
    isDown,
    wasPressed,
    takeMouse,
    moveAxis,
    endFrame,
    lock,
    unlock,
    get locked() {
      return locked;
    },
    set onLockChange(fn) {
      onLock = fn;
    },
  };
}
