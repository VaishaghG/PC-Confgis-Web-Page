/**
 * PC Configurator - Interactive Login Prompt
 * Shows a premium card to unauthenticated users on their first interaction.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check if card was dismissed in this session
    if (sessionStorage.getItem('loginPromptDismissed') === 'true') {
        return;
    }

    // 2. Check auth status
    const checkAuthStatus = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
            const data = await res.json();
            return data.loggedIn;
        } catch (err) {
            console.error('Error checking auth for login prompt:', err);
            return false;
        }
    };

    let interactionDetected = false;

    const showLoginPrompt = async () => {
        if (interactionDetected) return;
        interactionDetected = true;

        const isLoggedIn = await checkAuthStatus();
        if (isLoggedIn) return;

        // Create HTML structure
        const container = document.createElement('div');
        container.id = 'login-prompt-container';
        container.innerHTML = `
            <div class="login-prompt-card">
                <button class="close-btn" id="btn-close-prompt" aria-label="Close">&times;</button>
                <div class="login-prompt-content">
                    <i class="bi bi-person-circle login-prompt-icon"></i>
                    <h3 class="login-prompt-title">Unlock Your Full Potential</h3>
                    <p class="login-prompt-text">Log in to save your custom PC builds, track orders, and sync your cart across devices.</p>
                    <div class="login-prompt-actions">
                        <a href="login.html" class="btn btn-prompt-login">Login Now</a>
                        <a href="signup.html" class="btn btn-prompt-signup">Create Account</a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // Show the container first
        container.style.display = 'block';

        // Trigger animation after a small delay
        setTimeout(() => {
            const card = container.querySelector('.login-prompt-card');
            if (card) card.classList.add('show');
        }, 100);

        // Handle close
        const closeBtn = document.getElementById('btn-close-prompt');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const card = container.querySelector('.login-prompt-card');
                if (card) card.classList.remove('show');
                sessionStorage.setItem('loginPromptDismissed', 'true');
                
                // Remove from DOM after animation
                setTimeout(() => {
                    container.remove();
                }, 600);
            });
        }
    };

    // Listen for first interaction
    const handleInteraction = () => {
        showLoginPrompt();
        // Remove listeners once interaction is detected
        window.removeEventListener('scroll', handleInteraction);
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
});
