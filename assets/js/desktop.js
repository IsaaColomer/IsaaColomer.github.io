// Window Management Logic
let highestZ = 100;
let draggedElement = null;
let resizingElement = null;
let draggedIcon = null;

// Initial positions for dragging
let startMouseX = 0;
let startMouseY = 0;
let startElemX = 0;
let startElemY = 0;

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
    
    // Clear selections when opening a window
    document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    
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

// Helper to detect mobile/touch
const isMobile = () => window.innerWidth <= 768 || ('ontouchstart' in window);

// Global Mouse Down Handler
document.addEventListener('mousedown', function(e) {
    handleStart(e.clientX, e.clientY, e.target);
});

// Touch Support
document.addEventListener('touchstart', function(e) {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY, e.target);
}, { passive: false });

function handleStart(clientX, clientY, target) {
    // 1. Resize Check
    const resizeHandle = target.closest('.win-resize');
    if (resizeHandle) {
        if (window.innerWidth <= 768) return; // Disable on mobile
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
        const win = header.closest('.window');
        draggedElement = win;
        focusWindow(win);
        
        // Use offsetLeft/Top which are relative to the offsetParent (#desktop)
        startElemX = win.offsetLeft;
        startElemY = win.offsetTop;
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

        // On mobile, if already selected, open on single tap
        if (isMobile() && isAlreadySelected) {
            const windowId = icon.getAttribute('ondblclick').match(/'([^']+)'/)[1];
            window.openWindow(windowId);
            return;
        }

        draggedIcon = icon;
        startElemX = icon.offsetLeft;
        startElemY = icon.offsetTop;
        startMouseX = clientX;
        startMouseY = clientY;
        
        icon.style.transition = 'none';
        icon.style.zIndex = highestZ + 1;
        return;
    } else {
        // Clear selection if clicking elsewhere
        if (!target.closest('.window')) {
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        }
    }

    // 4. Focus window on click
    const win = target.closest('.window');
    if (win) focusWindow(win);
}

// Global Mouse Move Handler
document.addEventListener('mousemove', function(e) {
    handleMove(e.clientX, e.clientY);
});

document.addEventListener('touchmove', function(e) {
    const touch = e.touches[0];
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

        // Boundaries
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + wRect.width > dRect.width) x = dRect.width - wRect.width;
        if (y + wRect.height > dRect.height) y = dRect.height - wRect.height;

        draggedElement.style.left = x + 'px';
        draggedElement.style.top = y + 'px';
        return;
    }

    // 3. Handle Icon Dragging
    if (draggedIcon) {
        let x = startElemX + deltaX;
        let y = startElemY + deltaY;

        draggedIcon.style.position = 'absolute';
        draggedIcon.style.left = x + 'px';
        draggedIcon.style.top = y + 'px';
    }
}

// Global Mouse Up Handler
document.addEventListener('mouseup', handleEnd);
document.addEventListener('touchend', handleEnd);

function handleEnd() {
    if (draggedElement) {
        draggedElement.style.transition = '';
        draggedElement = null;
    }
    if (resizingElement) {
        resizingElement = null;
    }
    if (draggedIcon) {
        draggedIcon.style.transition = '';
        // Save position
        localStorage.setItem(`pos-${draggedIcon.id}`, JSON.stringify({
            left: draggedIcon.style.left,
            top: draggedIcon.style.top
        }));
        draggedIcon = null;
    }
}

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
