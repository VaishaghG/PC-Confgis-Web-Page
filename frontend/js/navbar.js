document.addEventListener('DOMContentLoaded', () => {
    const navUser = document.getElementById('navUser');
    const accountBtn = document.getElementById('nav-account-btn');

    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
            if (navUser) {
                if (data.loggedIn) {
                    navUser.innerText = `Welcome, ${data.name}`;
                }
            }
            // Wire profile icon: logged in → dashboard, guest → login
            if (accountBtn) {
                accountBtn.href = data.loggedIn
                    ? 'dashboard.html'
                    : 'login.html';
            }

            // Wire cart icon: guest → login with redirect
            const cartBtn = document.querySelector('a[href="cart.html"]');
            if (cartBtn && !data.loggedIn) {
                cartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = `${FRONTEND_BASE_URL}/login.html?redirect=${FRONTEND_BASE_URL}/cart.html&error=unauth`;
                });
            }
        })
        .catch(err => console.error('Error fetching user status for navbar:', err));
});
