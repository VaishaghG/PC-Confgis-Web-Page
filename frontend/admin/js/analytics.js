async function loadAnalytics() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/analytics`, { credentials: 'include' });
        const data = await res.json();

        const totalUsers = data.totalUsers || 0;
        const totalOrders = data.totalOrders || 0;
        const revenue = data.revenue || 0;
        const popularItems = Array.isArray(data.popularItems) ? data.popularItems : [];
        const popularBuilds = Array.isArray(data.popularBuilds) ? data.popularBuilds : [];

        document.getElementById('stat-users').textContent = totalUsers;
        document.getElementById('stat-orders').textContent = totalOrders;
        document.getElementById('stat-revenue').textContent = formatCurrency(revenue);

        const averageOrderValue = totalOrders ? revenue / totalOrders : 0;
        const revenuePerUser = totalUsers ? revenue / totalUsers : 0;

        document.getElementById('stat-aov').textContent = formatCurrency(averageOrderValue);
        document.getElementById('stat-rpu').textContent = formatCurrency(revenuePerUser);
        document.getElementById('stat-top-category').textContent = getTopCategory(popularItems);

        document.getElementById('bar-revenue-value').textContent = formatCurrency(revenue);
        document.getElementById('bar-orders-value').textContent = totalOrders;
        document.getElementById('bar-users-value').textContent = totalUsers;

        renderBarChart({ revenue, totalOrders, totalUsers });
        renderPopularItems(popularItems);
        renderPopularBuilds(popularBuilds);

        console.log('Popular Items:', popularItems);
        console.log('Popular Builds:', popularBuilds);

        showNotification('Analytics updated.', 'success');
    } catch (err) {
        console.error('Analytics load error:', err);
        showNotification('Failed to load analytics.', 'error');
    }
}

function renderBarChart({ revenue, totalOrders, totalUsers }) {
    const maxValue = Math.max(revenue, totalOrders, totalUsers, 1);

    setBarWidth('bar-revenue', (revenue / maxValue) * 100);
    setBarWidth('bar-orders', (totalOrders / maxValue) * 100);
    setBarWidth('bar-users', (totalUsers / maxValue) * 100);
}

function setBarWidth(id, percentage) {
    const element = document.getElementById(id);
    if (element) {
        element.style.width = `${Math.max(8, percentage)}%`;
    }
}

function renderPopularItems(items) {
    const container = document.getElementById('popularItemsList');
    if (!container) {
        return;
    }

    if (!items.length) {
        container.innerHTML = '<div class="analytics-empty">No item sales data yet.</div>';
        return;
    }

    container.innerHTML = items.map((item, index) => `
        <article class="analytics-list-item">
            <div class="analytics-item-head">
                <div class="analytics-item-title">${escapeAnalytics(item._id || 'Unknown item')}</div>
                <div class="analytics-item-rank">#${index + 1}</div>
            </div>
            <div class="analytics-item-meta">
                ${escapeAnalytics(formatCategory(item.type))} • ${item.count || 0} sold
            </div>
        </article>
    `).join('');
}

function renderPopularBuilds(builds) {
    const container = document.getElementById('popularBuildsList');
    if (!container) {
        return;
    }

    if (!builds.length) {
        container.innerHTML = '<div class="analytics-empty">No build purchases recorded yet.</div>';
        return;
    }

    container.innerHTML = builds.map((build, index) => `
        <article class="analytics-list-item">
            <div class="analytics-item-head">
                <div class="analytics-item-title">${escapeAnalytics(build._id || 'Unnamed build')}</div>
                <div class="analytics-item-rank">#${index + 1}</div>
            </div>
            <div class="analytics-item-meta">
                ${build.count || 0} orders
            </div>
        </article>
    `).join('');
}

function getTopCategory(items) {
    if (!items.length) {
        return '-';
    }

    const counts = items.reduce((acc, item) => {
        const key = formatCategory(item.type);
        acc[key] = (acc[key] || 0) + (item.count || 0);
        return acc;
    }, {});

    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return topEntry ? topEntry[0] : '-';
}

function formatCategory(type) {
    if (!type) {
        return 'General';
    }

    return String(type)
        .replace(/[_-]/g, ' ')
        .replace(/^./, (char) => char.toUpperCase());
}

function formatCurrency(value) {
    return `$${Math.round(value).toLocaleString()}`;
}

function escapeAnalytics(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
