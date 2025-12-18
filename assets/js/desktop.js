// Window Management Logic
let highestZ = 100;
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;

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

// Window Functions
window.openWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;
    
    win.style.display = 'flex';
    win.classList.add('active');
    focusWindow(win);
};

window.closeWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'none';
    win.classList.remove('active');
};

function focusWindow(win) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('focused'));
    win.classList.add('focused');
    highestZ++;
    win.style.zIndex = highestZ;
}

// Draggability Logic
document.addEventListener('mousedown', function(e) {
    const header = e.target.closest('.window-header');
    if (!header) return;

    const win = header.closest('.window');
    draggedElement = win;
    focusWindow(win);

    const rect = win.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    draggedElement.style.transition = 'none';
});

document.addEventListener('mousemove', function(e) {
    if (!draggedElement) return;

    let x = e.clientX - offsetX;
    let y = e.clientY - offsetY;

    // Boundary Checks
    const desktop = document.getElementById('desktop');
    const dRect = desktop.getBoundingClientRect();
    const wRect = draggedElement.getBoundingClientRect();

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + wRect.width > dRect.width + dRect.left) x = dRect.width + dRect.left - wRect.width;
    // Don't go above the top bar (32px)
    if (y < 32) y = 32;

    draggedElement.style.left = x + 'px';
    draggedElement.style.top = y + 'px';
});

document.addEventListener('mouseup', function() {
    if (draggedElement) {
        draggedElement.style.transition = '';
        draggedElement = null;
    }
});

// Focus window on click anywhere inside it
document.addEventListener('click', function(e) {
    const win = e.target.closest('.window');
    if (win) focusWindow(win);
});

// Initialize
window.onload = () => {
    window.openWindow('win-about');
};

