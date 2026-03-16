document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const alertBox = document.getElementById('auth-alert');

    // Parse URL for redirect URL or error messages
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    const errorParam = urlParams.get('error');

    const googleBtn = document.querySelector('.btn-google');
    if (googleBtn) {
        let googleHref = `${API_BASE_URL}/api/auth/google`;
        if (redirectUrl) {
            googleHref += '?redirect=' + encodeURIComponent(redirectUrl);
        }
        googleBtn.href = googleHref;
    }

    // Show Google Auth Error
    if (errorParam === 'google' && alertBox) {
        showAlert('Google Sign-In failed. Please try again or use Email.');
    } else if (errorParam === 'unauth' && alertBox) {
        showAlert('Please log in to add items to your cart.');
    }

    function showAlert(msg, type = 'error') {
        showNotification(msg, type);
    }

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-login');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Logging in...`;
            btn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Clear any guest selections on login to start fresh
                    localStorage.removeItem('selectedBuild');
                    localStorage.removeItem('currentBuild');
                    sessionStorage.removeItem('selectedBuild');
                    sessionStorage.removeItem('currentBuild');

                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = '/frontend/index.html';
                    }
                } else {
                    showAlert(data.message || 'Login failed');
                    btn.innerHTML = `Login <i class="bi bi-arrow-right ms-2"></i>`;
                    btn.disabled = false;
                }
            } catch (err) {
                showAlert('Network error. Please try again.');
                btn.innerHTML = `Login <i class="bi bi-arrow-right ms-2"></i>`;
                btn.disabled = false;
            }
        });
    }

    // --- SIGNUP LOGIC ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-signup');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Signing up...`;
            btn.disabled = true;

            const username = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Clear any guest selections on signup
                    localStorage.removeItem('selectedBuild');
                    localStorage.removeItem('currentBuild');
                    sessionStorage.removeItem('selectedBuild');
                    sessionStorage.removeItem('currentBuild');

                    if (redirectUrl) {
                        window.location.href = redirectUrl;
                    } else {
                        window.location.href = '/frontend/index.html';
                    }
                } else {
                    showAlert(data.message || 'Signup failed');
                    btn.innerHTML = `Sign Up <i class="bi bi-person-plus ms-2"></i>`;
                    btn.disabled = false;
                }
            } catch (err) {
                showAlert('Network error. Please try again.');
                btn.innerHTML = `Sign Up <i class="bi bi-person-plus ms-2"></i>`;
                btn.disabled = false;
            }
        });
    }

    // Note: Google Sign In is handled natively by the <a> tag href hitting the backend route. 
    // The backend redirect manages the session creation automatically.
});
