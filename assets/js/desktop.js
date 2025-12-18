// Window Management Logic
let highestZ = 100;
let draggedElement = null;
let resizingElement = null;
let draggedIcon = null;
let offsetX = 0;
let offsetY = 0;
let startWidth = 0;
let startHeight = 0;

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

// Global Mouse Down Handler
document.addEventListener('mousedown', function(e) {
    // 1. Resize Check
    const resizeHandle = e.target.closest('.win-resize');
    if (resizeHandle) {
        resizingElement = resizeHandle.closest('.window');
        focusWindow(resizingElement);
        startWidth = resizingElement.offsetWidth;
        startHeight = resizingElement.offsetHeight;
        offsetX = e.clientX;
        offsetY = e.clientY;
        e.preventDefault();
        return;
    }

    // 2. Window Drag Check
    const header = e.target.closest('.window-header');
    if (header) {
        const win = header.closest('.window');
        draggedElement = win;
        focusWindow(win);
        const rect = win.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        draggedElement.style.transition = 'none';
        e.preventDefault();
        return;
    }

    // 3. Icon Drag Check
    const icon = e.target.closest('.desktop-icon');
    if (icon) {
        // Handle selection
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');

        draggedIcon = icon;
        const rect = icon.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        icon.style.transition = 'none';
        icon.style.zIndex = highestZ + 1;
        e.preventDefault();
        return;
    } else {
        // Clear selection if clicking elsewhere
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }

    // 4. Focus window on click
    const win = e.target.closest('.window');
    if (win) focusWindow(win);
});

// Global Mouse Move Handler
document.addEventListener('mousemove', function(e) {
    // 1. Handle Window Resizing
    if (resizingElement) {
        const newWidth = startWidth + (e.clientX - offsetX);
        const newHeight = startHeight + (e.clientY - offsetY);
        
        if (newWidth > 200) resizingElement.style.width = newWidth + 'px';
        if (newHeight > 150) resizingElement.style.height = newHeight + 'px';
        return;
    }

    // 2. Handle Window Dragging
    if (draggedElement) {
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        const desktop = document.getElementById('desktop');
        const dRect = desktop.getBoundingClientRect();
        const wRect = draggedElement.getBoundingClientRect();

        if (x < 0) x = 0;
        if (y < 32) y = 32;
        if (x + wRect.width > dRect.width + dRect.left) x = dRect.width + dRect.left - wRect.width;

        draggedElement.style.left = x + 'px';
        draggedElement.style.top = y + 'px';
        return;
    }

    // 3. Handle Icon Dragging
    if (draggedIcon) {
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;

        draggedIcon.style.position = 'absolute';
        draggedIcon.style.left = x + 'px';
        draggedIcon.style.top = y + 'px';
    }
});

// Global Mouse Up Handler
document.addEventListener('mouseup', function() {
    if (draggedElement) {
        draggedElement.style.transition = '';
        draggedElement = null;
    }
    if (resizingElement) {
        resizingElement = null;
    }
    if (draggedIcon) {
        draggedIcon.style.transition = '';
        // Save position optionally
        localStorage.setItem(`pos-${draggedIcon.id}`, JSON.stringify({
            left: draggedIcon.style.left,
            top: draggedIcon.style.top
        }));
        draggedIcon = null;
    }
});

// Initialize
window.onload = () => {
    window.openWindow('win-about');
    
    // Load Icon Positions
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        const pos = localStorage.getItem(`pos-${icon.id}`);
        if (pos) {
            const { left, top } = JSON.parse(pos);
            icon.style.position = 'absolute';
            icon.style.left = left;
            icon.style.top = top;
        }
    });
};
