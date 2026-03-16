/**
 * Universal Notification System
 * Replaces standard browser alerts with premium animated toasts.
 */

function showNotification(message, type = 'info', options = {}) {
    // 1. Ensure container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // 2. Create the toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast ${type}`;
    
    // Choose icon based on type
    let icon = 'bi-info-circle-fill';
    if (type === 'success') icon = 'bi-check-circle-fill';
    if (type === 'error') icon = 'bi-exclamation-circle-fill';
    if (type === 'warning') icon = 'bi-exclamation-triangle-fill';

    let html = `
        <i class="bi ${icon}"></i>
        <div class="notification-content">
            <span class="notification-message">${message}</span>
    `;

    // Add optional action button
    if (options.actionLabel && options.actionUrl) {
        html += `
            <div class="notification-actions">
                <a href="${options.actionUrl}" class="btn-toast-action">${options.actionLabel}</a>
            </div>
        `;
    }

    html += `</div>`;
    toast.innerHTML = html;

    // 3. Add to container
    container.appendChild(toast);

    // 4. Set auto-hide timer logic
    let dismissTimer;
    const startTimer = () => {
        dismissTimer = setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, 3000);
    };

    const stopTimer = () => {
        clearTimeout(dismissTimer);
    };

    // Hover logic: pause behavior
    toast.onmouseenter = stopTimer;
    toast.onmouseleave = startTimer;

    // Initial start
    startTimer();
}

/**
 * Custom Confirmation Dialog
 * message: string - The question to ask
 * onConfirm: function - Called if OK is clicked
 */
function showConfirmation(message, onConfirm) {
    // 1. Ensure container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // 2. Clear auto-dimming toasts to avoid clutter (optional, but cleaner)
    // container.innerHTML = '';

    // 3. Create overlay (backdrop)
    const backdrop = document.createElement('div');
    backdrop.className = 'notification-backdrop';
    document.body.appendChild(backdrop);

    // 4. Create confirmation toast
    const toast = document.createElement('div');
    toast.className = 'notification-toast confirmation';
    
    toast.innerHTML = `
        <i class="bi bi-question-circle-fill text-warning"></i>
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <div class="notification-confirm-actions">
                <button class="btn-confirm-ok">OK</button>
                <button class="btn-confirm-cancel">Cancel</button>
            </div>
        </div>
    `;

    container.appendChild(toast);

    // 5. Cleanup function
    const cleanup = () => {
        toast.classList.add('hide');
        backdrop.classList.add('fade-out');
        setTimeout(() => {
            toast.remove();
            backdrop.remove();
        }, 500);
    };

    // 6. Hook up buttons
    toast.querySelector('.btn-confirm-ok').onclick = () => {
        if (typeof onConfirm === 'function') onConfirm();
        cleanup();
    };

    toast.querySelector('.btn-confirm-cancel').onclick = () => {
        cleanup();
    };
}

// Optional: Override native alert (use with caution, better to call showNotification directly)
// window.alert = (msg) => showNotification(msg, 'info');
