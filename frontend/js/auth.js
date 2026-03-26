document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const forgotForm = document.getElementById('forgot-password-form');
    const forgotBtn = document.getElementById('btn-forgot-password');
    const cancelForgotBtn = document.getElementById('btn-cancel-forgot');
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

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function normalizeEmail(email) {
        return String(email || '').trim().toLowerCase();
    }

    function isValidEmail(email) {
        return EMAIL_REGEX.test(normalizeEmail(email));
    }

    function initPasswordToggles(scope = document) {
        scope.querySelectorAll('[data-password-toggle]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const wrapper = btn.closest('.input-wrapper, .password-input-group');
                const input = wrapper?.querySelector('[data-password-input]');
                if (!input) return;

                const reveal = input.type === 'password';
                input.type = reveal ? 'text' : 'password';

                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye', !reveal);
                    icon.classList.toggle('bi-eye-slash', reveal);
                }
                btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
                btn.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
            });
        });
    }

    function resetForgotView(showForgot) {
        if (!loginForm || !forgotForm) return;
        loginForm.classList.toggle('d-none', showForgot);
        forgotForm.classList.toggle('d-none', !showForgot);
        forgotBtn?.classList.toggle('d-none', showForgot);
        if (!showForgot) {
            forgotForm.reset();
            forgotForm.querySelectorAll('[data-password-input]').forEach((input) => {
                input.type = 'password';
            });
            forgotForm.querySelectorAll('[data-password-toggle]').forEach((btn) => {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
                btn.setAttribute('aria-pressed', 'false');
                btn.setAttribute('aria-label', 'Show password');
            });
        }
    }

    initPasswordToggles();

    // --- LOGIN LOGIC ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = normalizeEmail(document.getElementById('email').value);
            const password = document.getElementById('password').value;

            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email like name@gmail.com.');
                return;
            }

            const btn = document.getElementById('btn-login');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Logging in...`;
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Clear any guest selections on login to start fresh
                    localStorage.clear();
                    sessionStorage.clear();
                    if (data.user) {
                        localStorage.setItem("user", JSON.stringify(data.user));
                    }
                    window.location.href = data.redirect || redirectUrl || (FRONTEND_BASE_URL + '/index.html');
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

    if (forgotBtn && forgotForm) {
        forgotBtn.addEventListener('click', () => resetForgotView(true));
    }

    if (cancelForgotBtn) {
        cancelForgotBtn.addEventListener('click', () => resetForgotView(false));
    }

    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = normalizeEmail(document.getElementById('fp-email').value);
            const newPassword = document.getElementById('fp-password').value;
            const confirmPassword = document.getElementById('fp-confirm').value;

            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email like name@gmail.com.');
                return;
            }
            if (newPassword.length < 6) {
                showAlert('Password must be at least 6 characters.');
                return;
            }
            if (newPassword !== confirmPassword) {
                showAlert('New password and confirm password do not match.');
                return;
            }

            const btn = document.getElementById('btn-forgot-submit');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Resetting...`;
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password-reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ email, newPassword })
                });
                const data = await res.json();

                if (res.ok) {
                    showNotification(data.message || 'Password reset successful. Please log in.', 'success');
                    const loginEmail = document.getElementById('email');
                    if (loginEmail) loginEmail.value = email;
                    resetForgotView(false);
                } else {
                    showAlert(data.message || 'Failed to reset password.');
                }
            } catch (err) {
                showAlert('Network error. Please try again.');
            } finally {
                btn.innerHTML = `Reset Password`;
                btn.disabled = false;
            }
        });
    }

    // --- SIGNUP LOGIC ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('name').value.trim();
            const email = normalizeEmail(document.getElementById('email').value);
            const password = document.getElementById('password').value;

            if (!isValidEmail(email)) {
                showAlert('Please enter a valid email like name@gmail.com.');
                return;
            }

            const btn = document.getElementById('btn-signup');
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Signing up...`;
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ username, email, password })
                });

                const data = await res.json();

                if (res.ok) {
                    // Clear any guest selections on signup
                    localStorage.clear();
                    sessionStorage.clear();
                    if (data.user) {
                        localStorage.setItem("user", JSON.stringify(data.user));
                    }
                    window.location.href = redirectUrl || (FRONTEND_BASE_URL + '/index.html');
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
