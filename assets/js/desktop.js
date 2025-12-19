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

    // Special handling for Racer game: restart/reload iframe if it's empty
    if (id === 'win-racer') {
        const iframe = win.querySelector('iframe');
        if (iframe && (!iframe.src || iframe.src === 'about:blank' || iframe.src === window.location.href)) {
            iframe.src = './racer/index.html';
        }
    }
    
    focusWindow(win);
};

window.closeWindow = function(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'none';
    win.classList.remove('active');

    // Special handling for Racer game: clear iframe to stop audio
    if (id === 'win-racer') {
        const iframe = win.querySelector('iframe');
        if (iframe) {
            iframe.src = 'about:blank';
        }
    }
};

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
        // Only start dragging if moved more than 3px to avoid accidental "freezing" on click
        if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
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
    if (draggedElement) {
        draggedElement.style.transition = '';
        draggedElement = null;
    }
    if (resizingElement) {
        resizingElement = null;
    }
    if (draggedIcon) {
        draggedIcon.style.transition = '';
        // Save position only if it was actually moved (has absolute position and coordinates)
        if (draggedIcon.style.position === 'absolute' && draggedIcon.style.left && draggedIcon.style.top) {
            localStorage.setItem(`pos-${draggedIcon.id}`, JSON.stringify({
                left: draggedIcon.style.left,
                top: draggedIcon.style.top
            }));
        }
        draggedIcon = null;
    }
}

// Initialize
window.onload = () => {
    window.openWindow('win-about');
    
    // Load Icon Positions
    const icons = document.querySelectorAll('.desktop-icon');
    icons.forEach(icon => {
        const pos = localStorage.getItem(`pos-${icon.id}`);
        if (pos) {
            try {
                const parsed = JSON.parse(pos);
                if (parsed && parsed.left && parsed.top) {
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

    // CRITICAL FIX: After loading saved positions, freeze any icons still in the grid flow
    // This prevents the "layout collapse" that causes icons to stack at the same position
    setTimeout(() => {
        icons.forEach(icon => {
            if (window.getComputedStyle(icon).position !== 'absolute') {
                const curLeft = icon.offsetLeft;
                const curTop = icon.offsetTop;
                icon.style.position = 'absolute';
                icon.style.left = curLeft + 'px';
                icon.style.top = curTop + 'px';
            }
        });
    }, 100); // Small delay to ensure grid has rendered
};

// Close dropdown when clicking outside
document.addEventListener('mousedown', function(e) {
    const menu = document.getElementById('system-menu');
    const trigger = document.getElementById('system-trigger');
    if (menu && trigger && !menu.contains(e.target) && !trigger.contains(e.target)) {
        closeDropdown();
    }
});
