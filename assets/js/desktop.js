// Window Management Logic
let highestZ = 100;
let draggedElement = null;
let resizingElement = null;
let draggedIcon = null;

// Preferences / OS state
let soundsEnabled = false;
let audioCtx = null;
let idleTimer = null;
let isScreensaverActive = false;
let screensaverActivatedAt = 0;

// Desktop icon layout: enforce non-overlapping slots
let iconGrid = null; // { stepX, stepY, cols, rows }

// Initial positions for dragging
let startMouseX = 0;
let startMouseY = 0;
let startElemX = 0;
let startElemY = 0;

let startWidth = 0;
let startHeight = 0;

// Terminal state
let termHistory = [];
let termHistoryIdx = -1;
let termInitialized = false;

// Skills Explorer state
let skillsInitialized = false;
let skillsActiveCategory = 'All';
let skillsActiveId = null;

// Interview.exe state
let interviewInitialized = false;
let interviewActiveId = null;

// Calculator state
let calcState = {
    display: '0',
    prev: null,
    op: null,
    resetNext: false
};

// Music player (UI-only) state
let musicState = {
    tracks: ['CRT Dreams', 'Blue Screen Serenade', 'Teal Desktop Anthem', 'Kernel Panic (LoFi)'],
    index: 0,
    playing: false,
    progress: 0,
    interval: null
};

// Update Clock
function updateClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    const now = new Date();
    const options = { hour: 'numeric', minute: '2-digit', hour12: true };
    clockEl.textContent = now.toLocaleTimeString([], options);
}
setInterval(updateClock, 60000);
updateClock();

// -------------------------
// Utilities / Persistence
// -------------------------
function isMobile() {
    return window.innerWidth <= 768 || ('ontouchstart' in window);
}

function safeJSONParse(str) {
    try { return JSON.parse(str); } catch { return null; }
}

function saveWindowState(win) {
    if (!win || !win.id) return;
    // Only persist on desktop (mobile layout is forced via CSS)
    if (isMobile()) return;
    const state = {
        left: win.style.left || (win.offsetLeft + 'px'),
        top: win.style.top || (win.offsetTop + 'px'),
        width: win.style.width || (win.offsetWidth + 'px'),
        height: win.style.height || (win.offsetHeight + 'px')
    };
    localStorage.setItem(`winstate-${win.id}`, JSON.stringify(state));
}

function restoreWindowState(win) {
    if (!win || !win.id) return;
    if (isMobile()) return;
    const raw = localStorage.getItem(`winstate-${win.id}`);
    if (!raw) return;
    const s = safeJSONParse(raw);
    if (!s) return;
    if (s.left) win.style.left = s.left;
    if (s.top) win.style.top = s.top;
    if (s.width) win.style.width = s.width;
    if (s.height) win.style.height = s.height;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function computeGridFromIconPositions() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return null;
    const icons = Array.from(document.querySelectorAll('.desktop-icon'));
    if (icons.length === 0) return null;

    const dRect = desktop.getBoundingClientRect();
    const xs = [];
    const ys = [];

    icons.forEach(icon => {
        const rect = icon.getBoundingClientRect();
        xs.push(Math.round(rect.left - dRect.left));
        ys.push(Math.round(rect.top - dRect.top));
    });

    const uniqSort = (arr) => Array.from(new Set(arr)).sort((a, b) => a - b);
    const uniqXs = uniqSort(xs);
    const uniqYs = uniqSort(ys);

    const smallestStep = (arr) => {
        let best = null;
        for (let i = 1; i < arr.length; i++) {
            const diff = arr[i] - arr[i - 1];
            // ignore tiny diffs from rounding/noise
            if (diff > 40 && (best === null || diff < best)) best = diff;
        }
        return best;
    };

    const stepX = smallestStep(uniqXs) || 152; // fallback: 120 + ~32 gap
    const stepY = smallestStep(uniqYs) || 152;

    const cols = Math.max(1, Math.floor(dRect.width / stepX));
    const rows = Math.max(1, Math.floor(dRect.height / stepY));

    return { stepX, stepY, cols, rows };
}

function iconCellFromPos(left, top, grid) {
    const g = grid || iconGrid;
    if (!g) return { ix: 0, iy: 0 };
    const ix = clamp(Math.round(left / g.stepX), 0, g.cols - 1);
    const iy = clamp(Math.round(top / g.stepY), 0, g.rows - 1);
    return { ix, iy };
}

function applyIconCell(icon, cell, grid) {
    const g = grid || iconGrid;
    if (!g) return;
    icon.style.position = 'absolute';
    icon.style.left = (cell.ix * g.stepX) + 'px';
    icon.style.top = (cell.iy * g.stepY) + 'px';
    icon.style.bottom = 'auto';
    icon.style.right = 'auto';
}

function findNearestFreeCell(preferred, occupied, grid) {
    const g = grid || iconGrid;
    if (!g) return preferred;

    const key = (ix, iy) => `${ix},${iy}`;
    const isFree = (ix, iy) => !occupied.has(key(ix, iy));

    const startIx = clamp(preferred.ix, 0, g.cols - 1);
    const startIy = clamp(preferred.iy, 0, g.rows - 1);
    if (isFree(startIx, startIy)) return { ix: startIx, iy: startIy };

    const maxR = Math.max(g.cols, g.rows) + 2;
    for (let r = 1; r <= maxR; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // ring only
                const ix = startIx + dx;
                const iy = startIy + dy;
                if (ix < 0 || iy < 0 || ix >= g.cols || iy >= g.rows) continue;
                if (isFree(ix, iy)) return { ix, iy };
            }
        }
    }

    // fallback: first free scan
    for (let iy = 0; iy < g.rows; iy++) {
        for (let ix = 0; ix < g.cols; ix++) {
            if (isFree(ix, iy)) return { ix, iy };
        }
    }
    return { ix: startIx, iy: startIy };
}

function layoutIconsNoOverlap({ persist = false } = {}) {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;

    iconGrid = computeGridFromIconPositions() || iconGrid;
    const g = iconGrid;
    if (!g) return;

    const dRect = desktop.getBoundingClientRect();
    const icons = Array.from(document.querySelectorAll('.desktop-icon'));

    const items = icons.map(icon => {
        const rect = icon.getBoundingClientRect();
        return {
            icon,
            left: Math.round(rect.left - dRect.left),
            top: Math.round(rect.top - dRect.top)
        };
    }).sort((a, b) => (a.top - b.top) || (a.left - b.left) || (a.icon.id.localeCompare(b.icon.id)));

    const occupied = new Set();
    const key = (ix, iy) => `${ix},${iy}`;

    items.forEach(({ icon, left, top }) => {
        const preferred = iconCellFromPos(left, top, g);
        const cell = findNearestFreeCell(preferred, occupied, g);
        occupied.add(key(cell.ix, cell.iy));
        applyIconCell(icon, cell, g);

        if (persist && icon.id) {
            localStorage.setItem(`pos-${icon.id}`, JSON.stringify({
                left: icon.style.left,
                top: icon.style.top
            }));
        }
    });
}

function ensureWithinDesktop(win) {
    if (!win) return;
    if (isMobile()) return;
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    const dRect = desktop.getBoundingClientRect();
    const wRect = win.getBoundingClientRect();

    // current left/top relative to desktop
    const curLeft = (parseInt(win.style.left || '0', 10) || 0);
    const curTop = (parseInt(win.style.top || '0', 10) || 0);

    const maxLeft = Math.max(0, Math.floor(dRect.width - wRect.width));
    const maxTop = Math.max(0, Math.floor(dRect.height - wRect.height));

    const clampedLeft = clamp(curLeft, 0, maxLeft);
    const clampedTop = clamp(curTop, 0, maxTop);

    win.style.left = clampedLeft + 'px';
    win.style.top = clampedTop + 'px';
}

// -------------------------
// System Sounds (WebAudio)
// -------------------------
function ensureAudio() {
    if (!soundsEnabled) return null;
    if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        return audioCtx;
    } catch (e) {
        console.warn('AudioContext not available', e);
        return null;
    }
}

function beep(type = 'click') {
    if (!soundsEnabled) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    // Resume if suspended (often required after user gesture)
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    let freq = 520;
    let dur = 0.045;
    let vol = 0.05;
    if (type === 'open') { freq = 640; dur = 0.05; vol = 0.06; }
    if (type === 'close') { freq = 320; dur = 0.05; vol = 0.06; }
    if (type === 'error') { freq = 180; dur = 0.12; vol = 0.08; }
    if (type === 'ok') { freq = 740; dur = 0.06; vol = 0.06; }

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + dur + 0.02);
}

window.toggleSounds = function() {
    soundsEnabled = !soundsEnabled;
    localStorage.setItem('sounds-enabled', String(soundsEnabled));
    updateSoundsToggleUI(soundsEnabled);
    beep(soundsEnabled ? 'ok' : 'close');
};

function updateSoundsToggleUI(isEnabled) {
    const btn = document.getElementById('sounds-toggle');
    if (!btn) return;
    btn.classList.remove('toggle-active', 'toggle-inactive');
    btn.classList.add(isEnabled ? 'toggle-active' : 'toggle-inactive');
}

// -------------------------
// Screensaver
// -------------------------
function showScreensaver() {
    const el = document.getElementById('screensaver');
    if (!el) return;
    isScreensaverActive = true;
    screensaverActivatedAt = Date.now();
    el.classList.add('active');
}

function hideScreensaver() {
    const el = document.getElementById('screensaver');
    if (!el) return;
    isScreensaverActive = false;
    el.classList.remove('active');
}

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    // 90s idle
    idleTimer = setTimeout(() => {
        showScreensaver();
    }, 90000);
}

window.startScreensaver = function() {
    showScreensaver();
};

// -------------------------
// Error Dialog (Easter Eggs)
// -------------------------
function showError(title, body) {
    const t = document.getElementById('error-title');
    const b = document.getElementById('error-body');
    if (t) t.textContent = title || 'System Error';
    if (b) b.textContent = body || 'An unknown process has attempted to be extremely productive.';
    beep('error');
    window.openWindow('win-error');
}

window.triggerEasterEggError = function(filename) {
    const errs = [
        ['File not found', `Cannot locate '${filename}'. It might be in /dev/null.`],
        ['Access denied', `Permission denied: '${filename}'. Try turning it off and on again.`],
        ['Unexpected success', `Operation completed successfully. This is suspicious.`],
        ['Kernel Panic', `The system encountered a vibe mismatch while reading '${filename}'.`],
        ['Todo.exe crashed', `A wild TODO appeared. It was not handled.`]
    ];
    const pick = errs[Math.floor(Math.random() * errs.length)];
    showError(pick[0], pick[1]);
};

// Window Functions
window.openWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;

    resetIdleTimer();
    if (isScreensaverActive) hideScreensaver();
    
    // Clear selections when opening a window
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    
    // Restore window state (position/size)
    restoreWindowState(win);

    // Remove closing class if it was still there
    win.classList.remove('closing');
    win.style.display = 'flex';
    win.classList.add('active');
    ensureWithinDesktop(win);

    // Special handling for Racer game: restart/reload iframe if it's empty
    if (id === 'win-racer') {
        const iframe = win.querySelector('iframe');
        if (iframe && (!iframe.src || iframe.src === 'about:blank' || iframe.src === window.location.href)) {
            iframe.src = './racer/index.html';
        }
    }

    // Special handling for Pacman game
    if (id === 'win-pacman') {
        const iframe = win.querySelector('iframe');
        if (iframe && (!iframe.src || iframe.src === 'about:blank' || iframe.src === window.location.href)) {
            iframe.src = './Pacman/index.html';
        }
    }

    // Terminal: focus input
    if (id === 'win-terminal') {
        initTerminalIfNeeded();
        const input = document.getElementById('terminal-input');
        if (input) setTimeout(() => input.focus(), 0);
    }

    // Notepad: load and focus
    if (id === 'win-notepad') {
        initNotepadIfNeeded();
        const ta = document.getElementById('notepad-text');
        if (ta) setTimeout(() => ta.focus(), 0);
    }

    // Music: refresh UI
    if (id === 'win-music') {
        musicRender();
    }

    // Skills Explorer: lazy init + render
    if (id === 'win-skills') {
        initSkillsExplorerIfNeeded();
    }

    // Interview.exe: lazy init + render
    if (id === 'win-interview') {
        initInterviewIfNeeded();
    }
    
    focusWindow(win);
    beep('open');
};

window.closeWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;

    resetIdleTimer();
    // Persist window state before hiding
    saveWindowState(win);

    // Notepad autosave on close
    if (id === 'win-notepad') {
        notepadSave();
    }

    // Music: stop UI animation
    if (id === 'win-music') {
        musicStop();
    }

    // Handle animations if enabled
    if (document.body.classList.contains('animations-enabled')) {
        win.classList.add('closing');
        win.classList.remove('active');
        
        // Wait for animation to finish before hiding
        setTimeout(() => {
            if (win.classList.contains('closing')) { // Check if still closing
                win.style.display = 'none';
                win.classList.remove('closing');
                cleanupWindow(id, win);
            }
        }, 200); // Match CSS animation duration
    } else {
        win.style.display = 'none';
        win.classList.remove('active');
        cleanupWindow(id, win);
    }

    beep('close');
};

function cleanupWindow(id, win) {
    // Special handling for Racer game: clear iframe to stop audio
    if (id === 'win-racer') {
        const iframe = win.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
        }
    }

    // Special handling for Pacman game: clear iframe to stop audio
    if (id === 'win-pacman') {
        const iframe = win.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
        }
    }
}

// Dropdown Logic
window.toggleDropdown = function() {
    const menu = document.getElementById('system-menu');
    const trigger = document.getElementById('system-trigger');
    if (menu && trigger) {
        const isShown = menu.classList.contains('show');
        if (isShown) {
            menu.classList.remove('show');
            trigger.classList.remove('active');
        } else {
            menu.classList.add('show');
            trigger.classList.add('active');
        }
    }
};

window.closeDropdown = function() {
    const menu = document.getElementById('system-menu');
    const trigger = document.getElementById('system-trigger');
    if (menu && trigger) {
        menu.classList.remove('show');
        trigger.classList.remove('active');
    }
};

// Animation Toggle Logic
window.toggleAnimations = function() {
    const isEnabled = document.body.classList.toggle('animations-enabled');
    localStorage.setItem('animations-enabled', isEnabled);
    updateAnimToggleUI(isEnabled);
};

function updateAnimToggleUI(isEnabled) {
    const btn = document.getElementById('anim-toggle');
    if (btn) {
        btn.classList.remove('toggle-active', 'toggle-inactive');
        btn.classList.add(isEnabled ? 'toggle-active' : 'toggle-inactive');
    }
}

function focusWindow(win) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    win.classList.add('focused');
    highestZ++;
    win.style.zIndex = highestZ;
}

// -------------------------
// Terminal
// -------------------------
function termEl() {
    return document.getElementById('terminal-output');
}

function termWrite(text, cls) {
    const out = termEl();
    if (!out) return;
    const div = document.createElement('div');
    div.className = cls ? cls : 'terminal-line';
    div.textContent = text;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
}

function termInfo(text) {
    // Only print if terminal window exists & was initialized
    if (!document.getElementById('win-terminal')) return;
    if (!termInitialized) return;
    termWrite(text, 'terminal-ok');
}

function initTerminalIfNeeded() {
    if (termInitialized) return;
    const input = document.getElementById('terminal-input');
    const out = termEl();
    if (!input || !out) return;

    termInitialized = true;
    termWrite('IsaacOS Terminal v1.0', 'terminal-ok');
    termWrite("Type 'help' to see available commands.", 'terminal-line');
    termWrite('', 'terminal-line');

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const raw = input.value || '';
            input.value = '';
            handleTerminalCommand(raw);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (termHistory.length === 0) return;
            termHistoryIdx = clamp(termHistoryIdx < 0 ? termHistory.length - 1 : termHistoryIdx - 1, 0, termHistory.length - 1);
            input.value = termHistory[termHistoryIdx] || '';
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (termHistory.length === 0) return;
            termHistoryIdx = clamp(termHistoryIdx + 1, 0, termHistory.length);
            input.value = termHistoryIdx >= termHistory.length ? '' : (termHistory[termHistoryIdx] || '');
            return;
        }
    });
}

function handleTerminalCommand(raw) {
    const cmdLine = raw.trim();
    termWrite(`isaac@os:~$ ${cmdLine}`, 'terminal-line');
    resetIdleTimer();

    if (!cmdLine) return;
    termHistory.push(cmdLine);
    termHistoryIdx = termHistory.length;

    const parts = cmdLine.split(' ').filter(Boolean);
    const cmd = (parts[0] || '').toLowerCase();
    const arg = parts.slice(1).join(' ');

    if (cmd === 'help') {
        termWrite('Commands:', 'terminal-ok');
        termWrite('  help                show this help', 'terminal-line');
        termWrite('  clear               clear terminal', 'terminal-line');
        termWrite('  about               open About window', 'terminal-line');
        termWrite('  experience          open Experience window', 'terminal-line');
        termWrite('  work | projects      open Work window', 'terminal-line');
        termWrite('  skills              open Skills Explorer', 'terminal-line');
        termWrite('  interview           open Interview.exe', 'terminal-line');
        termWrite('  contact             open Contact window', 'terminal-line');
        termWrite('  sounds [on|off]', 'terminal-line');
        termWrite('  animations [on|off]', 'terminal-line');
        termWrite('  screensaver         start screensaver', 'terminal-line');
        termWrite('  date                print current date', 'terminal-line');
        termWrite('  echo <text>', 'terminal-line');
        return;
    }

    if (cmd === 'clear') {
        const out = termEl();
        if (out) out.innerHTML = '';
        return;
    }

    if (cmd === 'about') return window.openWindow('win-about');
    if (cmd === 'experience') return window.openWindow('win-experience');
    if (cmd === 'work' || cmd === 'projects') return window.openWindow('win-projects');
    if (cmd === 'contact') return window.openWindow('win-contact');
    if (cmd === 'skills' || cmd === 'skills.exe') return window.openWindow('win-skills');
    if (cmd === 'interview' || cmd === 'interview.exe') return window.openWindow('win-interview');

    if (cmd === 'sounds') {
        const v = (arg || '').trim().toLowerCase();
        if (v === 'on') {
            if (!soundsEnabled) window.toggleSounds();
            termWrite('Sounds: ON', 'terminal-ok');
            return;
        }
        if (v === 'off') {
            if (soundsEnabled) window.toggleSounds();
            termWrite('Sounds: OFF', 'terminal-ok');
            return;
        }
        termWrite(`Sounds is currently: ${soundsEnabled ? 'ON' : 'OFF'}`, 'terminal-line');
        termWrite('Usage: sounds on|off', 'terminal-line');
        return;
    }

    if (cmd === 'animations') {
        const v = (arg || '').trim().toLowerCase();
        if (v === 'on') {
            if (!document.body.classList.contains('animations-enabled')) window.toggleAnimations();
            termWrite('Animations: ON', 'terminal-ok');
            return;
        }
        if (v === 'off') {
            if (document.body.classList.contains('animations-enabled')) window.toggleAnimations();
            termWrite('Animations: OFF', 'terminal-ok');
            return;
        }
        termWrite(`Animations is currently: ${document.body.classList.contains('animations-enabled') ? 'ON' : 'OFF'}`, 'terminal-line');
        termWrite('Usage: animations on|off', 'terminal-line');
        return;
    }

    if (cmd === 'screensaver') {
        window.startScreensaver();
        termWrite('Screensaver started.', 'terminal-ok');
        return;
    }

    if (cmd === 'date') {
        termWrite(new Date().toString(), 'terminal-line');
        return;
    }

    if (cmd === 'echo') {
        termWrite(arg || '', 'terminal-line');
        return;
    }

    if (cmd === 'rm' || cmd === 'sudo') {
        showError('Nice try', 'This OS runs on pure vibes. No sudo today.');
        return;
    }

    termWrite(`Command not found: ${cmd}`, 'terminal-err');
    termWrite("Type 'help' for commands.", 'terminal-line');
}

// Global Mouse Down Handler
document.addEventListener('mousedown', function(e) {
    resetIdleTimer();
    handleStart(e.clientX, e.clientY, e.target);
});

// Touch Support
document.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    resetIdleTimer();
    handleStart(touch.clientX, touch.clientY, e.target);
}, { passive: false });

function handleStart(clientX, clientY, target) {
    // 1. Resize Check
    const resizeHandle = target.closest('.win-resize');
    if (resizeHandle) {
        if (window.innerWidth <= 768) return; // Disable on mobile
        document.body.classList.add('is-resizing');
        resizingElement = resizeHandle.closest('.window');
        focusWindow(resizingElement);
        startWidth = resizingElement.offsetWidth;
        startHeight = resizingElement.offsetHeight;
        startMouseX = clientX;
        startMouseY = clientY;
        return;
    }

    // 2. Window Drag Check
    const header = target.closest('.window-header');
    if (header) {
        if (window.innerWidth <= 768) return; // Disable on mobile
        document.body.classList.add('is-dragging');
        const win = header.closest('.window');
        draggedElement = win;
        focusWindow(win);
        
        const rect = win.getBoundingClientRect();
        const desktopRect = document.getElementById('desktop').getBoundingClientRect();
        
        // Calculate initial offset relative to the desktop container
        startElemX = rect.left - desktopRect.left;
        startElemY = rect.top - desktopRect.top;
        
        startMouseX = clientX;
        startMouseY = clientY;
        
        draggedElement.style.transition = 'none';
        return;
    }

    // 3. Icon Drag Check
    const icon = target.closest('.desktop-icon');
    if (icon) {
        const isAlreadySelected = icon.classList.contains('selected');
        
        // Handle selection
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');

        // On mobile, if already selected, open on single tap and DONT allow dragging
        if (isMobile()) {
            if (isAlreadySelected) {
                const windowId = icon.getAttribute('ondblclick').match(/'([^']+)'/)[1];
                window.openWindow(windowId);
            }
            return; // Exit handleStart to prevent icon dragging on mobile
        }

        draggedIcon = icon;
        
        // If it's the trash icon or hasn't been moved yet, it might have bottom/right or be in grid
        // Capture its current pixel position relative to offsetParent
        startElemX = icon.offsetLeft;
        startElemY = icon.offsetTop;
        
        startMouseX = clientX;
        startMouseY = clientY;
        
        icon.style.transition = 'none';
        highestZ++;
        icon.style.zIndex = highestZ;
        return;
    } else {
        // Clear selection if clicking elsewhere
        if (!target.closest('.window') && !target.closest('.system-dropdown')) {
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        }
    }

    // 4. Focus window on click
    const win = target.closest('.window');
    if (win) focusWindow(win);
}

// Global Mouse Move Handler
document.addEventListener('mousemove', function(e) {
    resetIdleTimer();
    handleMove(e.clientX, e.clientY);
});

document.addEventListener('touchmove', function(e) {
    const touch = e.touches[0];
    resetIdleTimer();
    handleMove(touch.clientX, touch.clientY);
}, { passive: false });

function handleMove(clientX, clientY) {
    const deltaX = clientX - startMouseX;
    const deltaY = clientY - startMouseY;

    // 1. Handle Window Resizing
    if (resizingElement) {
        const newWidth = startWidth + deltaX;
        const newHeight = startHeight + deltaY;
        
        if (newWidth > 200) resizingElement.style.width = newWidth + 'px';
        if (newHeight > 150) resizingElement.style.height = newHeight + 'px';
        return;
    }

    // 2. Handle Window Dragging
    if (draggedElement) {
        let x = startElemX + deltaX;
        let y = startElemY + deltaY;

        const desktop = document.getElementById('desktop');
        const dRect = desktop.getBoundingClientRect();
        const wRect = draggedElement.getBoundingClientRect();
        const snap = 12;

        // Boundaries
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + wRect.width > dRect.width) x = dRect.width - wRect.width;
        if (y + wRect.height > dRect.height) y = dRect.height - wRect.height;

        // Snap to edges
        if (Math.abs(x - 0) < snap) x = 0;
        if (Math.abs(y - 0) < snap) y = 0;
        if (Math.abs((x + wRect.width) - dRect.width) < snap) x = dRect.width - wRect.width;
        if (Math.abs((y + wRect.height) - dRect.height) < snap) y = dRect.height - wRect.height;

        draggedElement.style.left = x + 'px';
        draggedElement.style.top = y + 'px';
        return;
    }

    // 3. Handle Icon Dragging
    if (draggedIcon) {
        // Only start dragging if moved more than 3px to avoid accidental "freezing" on click
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            document.body.classList.add('is-dragging');
            let x = startElemX + deltaX;
            let y = startElemY + deltaY;

            draggedIcon.style.position = 'absolute';
            draggedIcon.style.left = x + 'px';
            draggedIcon.style.top = y + 'px';
            // Clear bottom/right if they were set (like for trash icon)
            draggedIcon.style.bottom = 'auto';
            draggedIcon.style.right = 'auto';
        }
    }
}

// Global Mouse Up Handler
document.addEventListener('mouseup', handleEnd);
document.addEventListener('touchend', handleEnd);

function handleEnd() {
    document.body.classList.remove('is-dragging');
    document.body.classList.remove('is-resizing');
    if (draggedElement) {
        draggedElement.style.transition = '';
        saveWindowState(draggedElement);
        draggedElement = null;
    }
    if (resizingElement) {
        saveWindowState(resizingElement);
        resizingElement = null;
    }
    if (draggedIcon) {
        draggedIcon.style.transition = '';
        // If it was actually moved, snap everything to guaranteed non-overlapping slots and persist
        if (draggedIcon.style.position === 'absolute' && draggedIcon.style.left && draggedIcon.style.top) {
            layoutIconsNoOverlap({ persist: true });
        }
        draggedIcon = null;
    }
}

// -------------------------
// Notepad
// -------------------------
function initNotepadIfNeeded() {
    const ta = document.getElementById('notepad-text');
    if (!ta) return;
    if (ta.dataset.bound === '1') return;
    ta.dataset.bound = '1';

    const saved = localStorage.getItem('notepad-text') || '';
    ta.value = saved;

    let saveT = null;
    ta.addEventListener('input', () => {
        const status = document.getElementById('notepad-status');
        if (status) status.textContent = 'typing…';
        if (saveT) clearTimeout(saveT);
        saveT = setTimeout(() => {
            localStorage.setItem('notepad-text', ta.value || '');
            if (status) status.textContent = 'saved';
        }, 450);
    });
}

// -------------------------
// Skills Explorer
// -------------------------
const SKILLS_DATA = [
    {
        id: 'python',
        name: 'Python',
        category: 'AI / Automation',
        tags: ['ai', 'automation', 'data', 'scripting'],
        blurb: 'AI tooling, automation scripts, and data handling in production-ish workflows.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'llm_workflows',
        name: 'LLM workflows',
        category: 'AI / Automation',
        tags: ['llm', 'automation', 'prototyping'],
        blurb: 'Designing and integrating LLM-driven workflows to speed up prototypes and internal tooling.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'containerized_envs',
        name: 'Containerized environments',
        category: 'AI / Automation',
        tags: ['containers', 'envs', 'reproducibility'],
        blurb: 'Comfortable working with containerized setups to keep development and testing consistent.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'test_automation',
        name: 'Test automation',
        category: 'Testing / QA',
        tags: ['testing', 'automation', 'quality'],
        blurb: 'Automation and reliability-minded workflows for validating software behavior.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'qa_validation',
        name: 'Software validation (QA)',
        category: 'Testing / QA',
        tags: ['qa', 'validation', 'docs', 'process'],
        blurb: 'Executed comprehensive software validation and maintained validation documentation.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'c',
        name: 'C',
        category: 'Languages',
        tags: ['low-level', 'systems'],
        blurb: 'Solid foundation in C for performance-oriented and systems-adjacent programming.',
        proofs: [
            { label: 'About', url: '#', openWindowId: 'win-about' }
        ]
    },
    {
        id: 'cpp',
        name: 'C++',
        category: 'Languages',
        tags: ['performance', 'game-dev'],
        blurb: 'C++ experience oriented around game development and performance-sensitive code.',
        proofs: [
            { label: 'About', url: '#', openWindowId: 'win-about' }
        ]
    },
    {
        id: 'csharp',
        name: 'C#',
        category: 'Languages',
        tags: ['unity', '.net', 'game-dev'],
        blurb: 'C# for gameplay scripting, tooling, and Unity-centric development.',
        proofs: [
            { label: 'About', url: '#', openWindowId: 'win-about' }
        ]
    },
    {
        id: 'unity',
        name: 'Unity',
        category: 'Engines / Dev',
        tags: ['engine', 'game-dev', 'teaching'],
        blurb: 'Unity development and mentoring: gameplay systems, prototypes, and fundamentals.',
        proofs: [
            { label: 'Experience window', url: '#', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'unreal',
        name: 'Unreal Engine (UE 5.1)',
        category: 'Engines / Dev',
        tags: ['unreal', 'ue5', '3d'],
        blurb: 'Unreal Engine work including a UE 5.1 first-person walking simulator (final degree project).',
        proofs: [
            { label: 'Work window', url: '#', openWindowId: 'win-projects' },
            { label: 'Final Degree Work (YouTube)', url: 'https://www.youtube.com/watch?v=aa2Q2_MgMjY' }
        ]
    },
    {
        id: 'vr_quest',
        name: 'VR (Quest 2 optimization)',
        category: 'Engines / Dev',
        tags: ['vr', 'quest2', 'optimization'],
        blurb: 'VR project work optimized for Quest 2 constraints and performance targets.',
        proofs: [
            { label: 'Work window', url: '#', openWindowId: 'win-projects' },
            { label: 'Giravolt 2023 (GitHub)', url: 'https://github.com/Makinilla-maker/Giravolt2023' }
        ]
    },
    {
        id: 'game_design',
        name: 'Game design',
        category: 'Game Design',
        tags: ['design', 'systems', 'player-experience'],
        blurb: 'Design focused on player experience, systems, and iterative improvements.',
        proofs: [
            { label: 'Work window', url: '#', openWindowId: 'win-projects' },
            { label: 'Design projects page', url: 'generic.html' }
        ]
    },
    {
        id: 'level_design',
        name: 'Level design',
        category: 'Game Design',
        tags: ['level', 'layout', 'pacing'],
        blurb: 'Co-designed and built levels for a university project in a student-made engine.',
        proofs: [
            { label: 'Work window', url: '#', openWindowId: 'win-projects' },
            { label: "Dune Fremen's Rising (Info)", url: 'https://shorturl.at/hqtAC' }
        ]
    },
    {
        id: 'bugfixing_playtest',
        name: 'Bug fixing & playtesting',
        category: 'Game Dev',
        tags: ['bugs', 'playtesting', 'iteration'],
        blurb: 'Hands-on debugging and playtesting under game jam constraints.',
        proofs: [
            { label: 'Work window', url: '#', openWindowId: 'win-projects' },
            { label: 'Lights Out (itch.io)', url: 'https://osvak.itch.io/lights-out' }
        ]
    },
    {
        id: 'custom_engine_collab',
        name: 'Custom engine collaboration',
        category: 'Game Dev',
        tags: ['engine', 'collaboration', 'rpg'],
        blurb: 'Worked with a proprietary student-built engine to deliver a classic RPG project.',
        proofs: [
            { label: 'Caronte Mandate (release)', url: 'https://github.com/KuronoaScarlet/ProjectII/releases/tag/1.0' }
        ]
    },
    {
        id: 'html_css_js',
        name: 'HTML/CSS/JavaScript',
        category: 'Web / UI',
        tags: ['frontend', 'ui', 'dom'],
        blurb: 'Built this interactive desktop UI with custom windowing, drag/resize, and UI state.',
        proofs: [
            { label: 'This site (IsaacOS)', url: 'index.html' },
            { label: 'GitHub profile', url: 'https://github.com/IsaaColomer' }
        ]
    },
    {
        id: 'ui_state',
        name: 'UI state & interactions',
        category: 'Web / UI',
        tags: ['state', 'events', 'ux'],
        blurb: 'Comfortable managing UI state via event-driven DOM interactions (drag, resize, focus, overlays).',
        proofs: [
            { label: 'Desktop windowing UX', url: 'index.html' },
            { label: 'GitHub profile', url: 'https://github.com/IsaaColomer' }
        ]
    }
];

function initSkillsExplorerIfNeeded() {
    if (skillsInitialized) {
        renderSkillsExplorer();
        return;
    }
    const win = document.getElementById('win-skills');
    if (!win) return;

    const search = document.getElementById('skills-search');
    const cats = document.getElementById('skills-categories');
    const grid = document.getElementById('skills-grid');
    const count = document.getElementById('skills-count');
    const title = document.getElementById('skills-details-title');
    const body = document.getElementById('skills-details-body');
    const links = document.getElementById('skills-details-links');

    if (!search || !cats || !grid || !count || !title || !body || !links) return;

    skillsInitialized = true;

    search.addEventListener('input', () => {
        renderSkillsExplorer();
    });

    // Categories
    const categories = ['All', ...Array.from(new Set(SKILLS_DATA.map(s => s.category))).sort((a, b) => a.localeCompare(b))];
    cats.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'skills-cat-btn' + (cat === skillsActiveCategory ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => {
            skillsActiveCategory = cat;
            // Keep selection if it still exists in filtered set; otherwise clear
            const next = getFilteredSkills();
            if (!next.some(s => s.id === skillsActiveId)) skillsActiveId = null;
            renderSkillsExplorer();
        });
        cats.appendChild(btn);
    });

    // Initial selection: first skill
    const initial = SKILLS_DATA[0];
    skillsActiveId = initial ? initial.id : null;
    renderSkillsExplorer();
}

function getFilteredSkills() {
    const search = document.getElementById('skills-search');
    const q = (search && typeof search.value === 'string') ? search.value.trim().toLowerCase() : '';

    return SKILLS_DATA.filter(s => {
        if (skillsActiveCategory !== 'All' && s.category !== skillsActiveCategory) return false;
        if (!q) return true;
        const hay = `${s.name} ${(s.tags || []).join(' ')} ${s.category} ${s.blurb}`.toLowerCase();
        return hay.includes(q);
    });
}

function renderSkillsExplorer() {
    const cats = document.getElementById('skills-categories');
    const grid = document.getElementById('skills-grid');
    const count = document.getElementById('skills-count');
    const title = document.getElementById('skills-details-title');
    const body = document.getElementById('skills-details-body');
    const links = document.getElementById('skills-details-links');
    if (!cats || !grid || !count || !title || !body || !links) return;

    // Update category active state
    Array.from(cats.querySelectorAll('.skills-cat-btn')).forEach(btn => {
        btn.classList.toggle('active', btn.textContent === skillsActiveCategory);
    });

    const filtered = getFilteredSkills();
    count.textContent = `${filtered.length} skill${filtered.length === 1 ? '' : 's'}`;

    grid.innerHTML = '';
    filtered.forEach(s => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'skill-pill' + (s.id === skillsActiveId ? ' active' : '');
        pill.innerHTML = `
            <div class="skill-name"></div>
            <div class="skill-meta"></div>
        `;
        const name = pill.querySelector('.skill-name');
        const meta = pill.querySelector('.skill-meta');
        if (name) name.textContent = s.name;
        if (meta) meta.textContent = s.category;
        pill.addEventListener('click', () => {
            skillsActiveId = s.id;
            renderSkillsExplorer();
        });
        grid.appendChild(pill);
    });

    const active = filtered.find(s => s.id === skillsActiveId) || SKILLS_DATA.find(s => s.id === skillsActiveId) || null;
    if (!active && filtered[0]) {
        skillsActiveId = filtered[0].id;
    }

    const selected = filtered.find(s => s.id === skillsActiveId) || SKILLS_DATA.find(s => s.id === skillsActiveId) || null;
    if (!selected) {
        title.textContent = 'Pick a skill';
        body.textContent = 'Select a skill on the left to see details and proof links.';
        links.innerHTML = '';
        return;
    }

    title.textContent = selected.name;
    body.textContent = selected.blurb || '';
    links.innerHTML = '';

    (selected.proofs || []).forEach(p => {
        const a = document.createElement('a');
        a.className = 'skills-link';
        a.href = p.url || '#';
        a.textContent = p.label || 'Proof';
        if (p.openWindowId) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.openWindow(p.openWindowId);
            });
        } else if ((p.url || '').endsWith('.html') || (p.url || '').startsWith('#') || (p.url || '').includes('index.html')) {
            // In-site links open in same tab
        } else {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        links.appendChild(a);
    });
}

// -------------------------
// Interview.exe
// -------------------------
const INTERVIEW_QA = [
    {
        id: 'about_me',
        q: 'Tell me about yourself.',
        a: "I'm a videogame designer & programmer currently focused on AI development. I’ve worked on AI-powered internal tools and automation, and I also have experience in software validation/testing and mentoring students in programming and Unity.",
        proofs: [
            { label: 'About window', openWindowId: 'win-about' },
            { label: 'Experience window', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'ai_work',
        q: 'What have you built in AI / automation?',
        a: "At Mindsight Ventures I’ve been designing and implementing AI-powered features and automation tools across internal products, working with Python, containerized environments, and LLM-driven workflows to improve test automation, data processing, and prototyping.",
        proofs: [
            { label: 'Experience window', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'testing_approach',
        q: 'How do you approach testing and validation?',
        a: "I’ve executed comprehensive software validation to ensure compliance and correct functionality, coordinating with teams and maintaining validation documentation. I like testable changes, clear reproduction steps, and keeping reliability in mind throughout development.",
        proofs: [
            { label: 'Experience window', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'mentoring',
        q: 'Have you taught or mentored others?',
        a: "Yes — I taught programming, Unity development, and game design fundamentals, and mentored students on gameplay systems, level design, and code architecture from concept to prototype.",
        proofs: [
            { label: 'Experience window', openWindowId: 'win-experience' }
        ]
    },
    {
        id: 'bugfixing',
        q: 'How do you handle debugging under constraints?',
        a: "In a game jam context (Lights Out) I focused on programming, bug fixing, and playtesting. My approach is to reproduce quickly, isolate the smallest failing case, fix with minimal scope, and then re-test the critical paths.",
        proofs: [
            { label: 'Work window', openWindowId: 'win-projects' },
            { label: 'Lights Out (itch.io)', url: 'https://osvak.itch.io/lights-out' }
        ]
    },
    {
        id: 'project_proud',
        q: 'Pick a project you’re proud of and why.',
        a: "My UE 5.1 final degree project is a great example of shipping a complete experience: it’s a first-person walking simulator focused on environmental narrative. I like projects where the design intent and technical execution reinforce each other.",
        proofs: [
            { label: 'Work window', openWindowId: 'win-projects' },
            { label: 'Final Degree Work (YouTube)', url: 'https://www.youtube.com/watch?v=aa2Q2_MgMjY' }
        ]
    },
    {
        id: 'constraints_vr',
        q: 'How do you work with performance constraints?',
        a: "I worked on a VR project optimized for Quest 2, which forces you to be intentional about performance and constraints. I’m comfortable iterating with profiling/targets and making tradeoffs that keep the experience smooth.",
        proofs: [
            { label: 'Work window', openWindowId: 'win-projects' },
            { label: 'Màscares & Marquesos (GitHub)', url: 'https://github.com/Makinilla-maker/Giravolt2023' }
        ]
    },
    {
        id: 'role_fit',
        q: 'What roles are you targeting right now?',
        a: "I’m currently focusing on AI development, while also bringing a strong game-dev background (Unity/Unreal, design) and testing/validation experience. I’m best used in roles that combine building real features with a careful approach to quality.",
        proofs: [
            { label: 'About window', openWindowId: 'win-about' },
            { label: 'Experience window', openWindowId: 'win-experience' }
        ]
    }
];

function initInterviewIfNeeded() {
    const win = document.getElementById('win-interview');
    if (!win) return;

    const list = document.getElementById('interview-questions');
    const title = document.getElementById('interview-title');
    const answer = document.getElementById('interview-answer');
    const proofs = document.getElementById('interview-proofs');
    if (!list || !title || !answer || !proofs) return;

    if (!interviewInitialized) {
        interviewInitialized = true;
        // Default selection
        interviewActiveId = (INTERVIEW_QA[0] && INTERVIEW_QA[0].id) ? INTERVIEW_QA[0].id : null;
    }

    renderInterview();
}

function renderInterview() {
    const list = document.getElementById('interview-questions');
    const title = document.getElementById('interview-title');
    const answer = document.getElementById('interview-answer');
    const proofs = document.getElementById('interview-proofs');
    if (!list || !title || !answer || !proofs) return;

    list.innerHTML = '';
    INTERVIEW_QA.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'interview-q-btn' + (item.id === interviewActiveId ? ' active' : '');
        btn.textContent = item.q;
        btn.addEventListener('click', () => {
            interviewActiveId = item.id;
            renderInterview();
        });
        list.appendChild(btn);
    });

    const active = INTERVIEW_QA.find(x => x.id === interviewActiveId) || INTERVIEW_QA[0] || null;
    if (!active) {
        title.textContent = 'Select a question';
        answer.textContent = 'Click a question on the left to see a short, practiced answer and proof links.';
        proofs.innerHTML = '';
        return;
    }

    title.textContent = active.q;
    answer.textContent = active.a || '';
    proofs.innerHTML = '';

    (active.proofs || []).forEach(p => {
        const a = document.createElement('a');
        a.className = 'interview-proof';
        a.href = p.url || '#';
        a.textContent = p.label || 'Proof';
        if (p.openWindowId) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                window.openWindow(p.openWindowId);
            });
        } else {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }
        proofs.appendChild(a);
    });
}

window.notepadSave = function() {
    const ta = document.getElementById('notepad-text');
    const status = document.getElementById('notepad-status');
    if (!ta) return;
    localStorage.setItem('notepad-text', ta.value || '');
    if (status) status.textContent = 'saved';
    beep('ok');
};

window.notepadClear = function() {
    const ta = document.getElementById('notepad-text');
    const status = document.getElementById('notepad-status');
    if (!ta) return;
    ta.value = '';
    localStorage.setItem('notepad-text', '');
    if (status) status.textContent = 'cleared';
    beep('click');
};

// -------------------------
// Calculator
// -------------------------
function calcSetDisplay(val) {
    const el = document.getElementById('calc-display');
    if (el) el.textContent = val;
}

function calcFormat(n) {
    const s = String(n);
    if (s.length > 12) return Number(n).toPrecision(8);
    return s;
}

function calcCompute(a, b, op) {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return 'NaN';
    if (op === '+') return x + y;
    if (op === '-') return x - y;
    if (op === '*') return x * y;
    if (op === '/') return y === 0 ? '∞' : (x / y);
    return y;
}

window.calcPress = function(key) {
    resetIdleTimer();
    beep('click');

    const d = calcState.display;

    if (key === 'C') {
        calcState = { display: '0', prev: null, op: null, resetNext: false };
        calcSetDisplay(calcState.display);
        return;
    }

    if (key === '±') {
        if (d === '0') return;
        calcState.display = d.startsWith('-') ? d.slice(1) : '-' + d;
        calcSetDisplay(calcState.display);
        return;
    }

    if (key === '%') {
        const v = Number(d);
        if (Number.isNaN(v)) return;
        calcState.display = calcFormat(v / 100);
        calcSetDisplay(calcState.display);
        return;
    }

    if (key === '.') {
        if (calcState.resetNext) {
            calcState.display = '0.';
            calcState.resetNext = false;
            calcSetDisplay(calcState.display);
            return;
        }
        if (!d.includes('.')) {
            calcState.display = d + '.';
            calcSetDisplay(calcState.display);
        }
        return;
    }

    const isDigit = /^[0-9]$/.test(key);
    if (isDigit) {
        if (calcState.resetNext || d === '0') {
            calcState.display = key;
            calcState.resetNext = false;
        } else {
            calcState.display = d + key;
        }
        calcSetDisplay(calcState.display);
        return;
    }

    const isOp = ['+', '-', '*', '/'].includes(key);
    if (isOp) {
        if (calcState.prev !== null && calcState.op && !calcState.resetNext) {
            const res = calcCompute(calcState.prev, calcState.display, calcState.op);
            calcState.prev = String(res);
            calcState.display = calcFormat(res);
            calcSetDisplay(calcState.display);
        } else {
            calcState.prev = calcState.display;
        }
        calcState.op = key;
        calcState.resetNext = true;
        return;
    }

    if (key === '=') {
        if (calcState.prev === null || !calcState.op) return;
        const res = calcCompute(calcState.prev, calcState.display, calcState.op);
        calcState.display = calcFormat(res);
        calcState.prev = null;
        calcState.op = null;
        calcState.resetNext = true;
        calcSetDisplay(calcState.display);
        beep('ok');
        return;
    }
};

// -------------------------
// Music Player (UI-only)
// -------------------------
function musicEls() {
    return {
        title: document.getElementById('music-title'),
        play: document.getElementById('music-play'),
        progress: document.getElementById('music-progress'),
        list: document.getElementById('music-list'),
        eq: document.querySelectorAll('.music-eq .eq-col')
    };
}

function musicRender() {
    const els = musicEls();
    if (els.title) els.title.textContent = `${String(musicState.index + 1).padStart(2, '0')} · ${musicState.tracks[musicState.index]}`;
    if (els.play) els.play.textContent = musicState.playing ? '⏸' : '▶';
    if (els.progress) els.progress.style.width = `${musicState.progress}%`;
    if (els.list) {
        Array.from(els.list.querySelectorAll('.music-track')).forEach((btn, idx) => {
            btn.classList.toggle('active', idx === musicState.index);
        });
    }
}

function musicTick() {
    musicState.progress += 1.2;
    if (musicState.progress >= 100) {
        musicState.progress = 0;
        musicNext();
        return;
    }
    const els = musicEls();
    if (els.progress) els.progress.style.width = `${musicState.progress}%`;
    if (els.eq && els.eq.length) {
        els.eq.forEach(col => {
            col.style.height = `${20 + Math.floor(Math.random() * 75)}%`;
        });
    }
}

function musicStart() {
    if (musicState.interval) clearInterval(musicState.interval);
    musicState.interval = setInterval(musicTick, 180);
}

function musicStop() {
    if (musicState.interval) clearInterval(musicState.interval);
    musicState.interval = null;
    musicState.playing = false;
    musicRender();
}

window.musicLoad = function(idx) {
    musicState.index = clamp(idx, 0, musicState.tracks.length - 1);
    musicState.progress = 0;
    beep('click');
    musicRender();
    if (musicState.playing) musicStart();
};

window.musicToggle = function() {
    musicState.playing = !musicState.playing;
    beep(musicState.playing ? 'ok' : 'click');
    musicRender();
    if (musicState.playing) musicStart();
    else musicStop();
};

window.musicNext = function() {
    musicState.index = (musicState.index + 1) % musicState.tracks.length;
    musicState.progress = 0;
    beep('click');
    musicRender();
    if (musicState.playing) musicStart();
};

window.musicPrev = function() {
    musicState.index = (musicState.index - 1 + musicState.tracks.length) % musicState.tracks.length;
    musicState.progress = 0;
    beep('click');
    musicRender();
    if (musicState.playing) musicStart();
};

// Initialize
window.onload = () => {
    // Initialize Animations
    const animsEnabled = localStorage.getItem('animations-enabled') !== 'false'; // Default to true
    if (animsEnabled) {
        document.body.classList.add('animations-enabled');
    }
    updateAnimToggleUI(animsEnabled);

    // Initialize Sounds (default OFF)
    soundsEnabled = localStorage.getItem('sounds-enabled') === 'true';
    updateSoundsToggleUI(soundsEnabled);

    // Initialize idle timer / screensaver
    resetIdleTimer();
    document.addEventListener('keydown', resetIdleTimer);
    document.addEventListener('wheel', resetIdleTimer, { passive: true });
    document.addEventListener('mousemove', resetIdleTimer, { passive: true });
    document.addEventListener('touchstart', resetIdleTimer, { passive: true });

    window.openWindow('win-about');
    
    // Load Icon Positions
    const icons = document.querySelectorAll('.desktop-icon');
    icons.forEach(icon => {
        const pos = localStorage.getItem(`pos-${icon.id}`);
        if (pos) {
            try {
                const parsed = JSON.parse(pos);
                // Safety check: Don't load (0,0) positions as they are likely from a previous bug
                // and would cause icons to stack at the top-left.
                if (parsed && parsed.left && parsed.top && 
                    (parseInt(parsed.left) > 10 || parseInt(parsed.top) > 10)) {
                    icon.style.position = 'absolute';
                    icon.style.left = parsed.left;
                    icon.style.top = parsed.top;
                    icon.style.bottom = 'auto';
                    icon.style.right = 'auto';
                }
            } catch (e) {
                console.error("Error parsing icon position", e);
            }
        }
    });

    // CRITICAL FIX: To prevent icons stacking at (0,0) when switching to absolute,
    // we must capture ALL their grid positions FIRST, then apply them in a second pass.
    setTimeout(() => {
        const positions = [];
        icons.forEach(icon => {
            // Only capture if not already absolutely positioned by localStorage
            if (icon.style.position !== 'absolute') {
                const rect = icon.getBoundingClientRect();
                const desktopRect = document.getElementById('desktop').getBoundingClientRect();
                positions.push({
                    el: icon,
                    left: rect.left - desktopRect.left,
                    top: rect.top - desktopRect.top
                });
            }
        });

        // Apply absolute positions after all measurements are done
        positions.forEach(pos => {
            pos.el.style.position = 'absolute';
            pos.el.style.left = pos.left + 'px';
            pos.el.style.top = pos.top + 'px';
        });

        // Final pass: ensure icons can NEVER overlap (and persist fixed positions)
        layoutIconsNoOverlap({ persist: true });
    }, 500); // 500ms delay to ensure browser has finished layout/rendering

    // Hide boot screen once everything is ready
    const boot = document.getElementById('boot-screen');
    if (boot) {
        const bootDurationMs = 2500;
        const fill = boot.querySelector('.boot-bar-fill');

        // Determinate, slightly "steppy" progress to feel retro
        if (fill) {
            fill.style.animation = 'none';
            fill.style.transform = 'none';
            fill.style.width = '0%';
        }

        const start = performance.now();
        const tick = (now) => {
            const t = Math.min(1, (now - start) / bootDurationMs);
            const stepped = Math.floor(t * 22) / 22; // 22 steps
            if (fill) fill.style.width = `${Math.max(2, Math.round(stepped * 100))}%`;
            if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        setTimeout(() => {
            if (fill) fill.style.width = '100%';
            boot.classList.add('hidden');
        }, bootDurationMs);
    }
};

// Close dropdown when clicking outside
document.addEventListener('mousedown', function(e) {
    const menu = document.getElementById('system-menu');
    const trigger = document.getElementById('system-trigger');
    if (menu && trigger && !menu.contains(e.target) && !trigger.contains(e.target)) {
        closeDropdown();
    }
});

// Dismiss screensaver on interaction
function tryDismissScreensaver() {
    if (!isScreensaverActive) return;
    // Grace period to avoid immediate self-dismiss due to event noise right after activation
    if (Date.now() - screensaverActivatedAt < 250) return;
    hideScreensaver();
}

document.addEventListener('mousedown', tryDismissScreensaver);
document.addEventListener('touchstart', tryDismissScreensaver, { passive: true });
document.addEventListener('keydown', tryDismissScreensaver);
document.addEventListener('mousemove', tryDismissScreensaver, { passive: true });
document.addEventListener('wheel', tryDismissScreensaver, { passive: true });

// UI click sounds (lightweight): only for obvious controls
document.addEventListener('click', (e) => {
    if (!soundsEnabled) return;
    const t = e.target;
    if (!t) return;
    if (t.closest('.win-btn') || t.closest('.dropdown-content a') || t.closest('.calc-btn') || t.closest('.np-btn') || t.closest('.mp-btn') || t.closest('.music-track')) {
        beep('click');
    }
}, { passive: true });
