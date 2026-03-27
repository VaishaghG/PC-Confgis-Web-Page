document.addEventListener('DOMContentLoaded', () => {
    const navUser = document.getElementById('navUser');
    const accountBtn = document.getElementById('nav-account-btn');
    const navIcons = document.querySelector('.nav-icons');

    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            } else if (!data.loggedIn) {
                localStorage.removeItem('user');
            }

            if (navUser && data.loggedIn) {
                navUser.innerText = `Welcome, ${data.name}`;
            }

            if (accountBtn) {
                accountBtn.href = data.loggedIn ? '/dashboard.html' : '/login.html';
            }

            syncAdminButton(data.user, navIcons);

            const cartBtn = document.querySelector('a[href="/cart.html"], a[href="cart.html"]');
            if (cartBtn && !data.loggedIn) {
                cartBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    window.location.href = `${FRONTEND_BASE_URL}/login.html?redirect=${FRONTEND_BASE_URL}/cart.html&error=unauth`;
                });
            }
        })
        .catch((err) => console.error('Error fetching user status for navbar:', err));
});

function syncAdminButton(user, navIcons) {
    const existingAdminBtn = document.getElementById('nav-admin-btn');

    if (user?.role === 'admin' && navIcons && !existingAdminBtn) {
        const adminBtn = document.createElement('a');
        adminBtn.id = 'nav-admin-btn';
        adminBtn.className = 'glass-chip admin-btn';
        adminBtn.href = '/admin/dashboard.html';
        adminBtn.innerText = 'Admin Dashboard';
        navIcons.prepend(adminBtn);
        return;
    }

    if (user?.role !== 'admin' && existingAdminBtn) {
        existingAdminBtn.remove();
    }
}
