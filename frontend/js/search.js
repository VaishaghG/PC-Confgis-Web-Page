/**
 * PC Configurator - Dynamic Interactive Search
 * Resizes the icons container automatically when expanding.
 */

document.addEventListener('DOMContentLoaded', () => {
    const searchToggle = document.getElementById('btn-search-toggle');
    const iconsChip = document.querySelector('.nav-icons-chip');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const navUser = document.getElementById('navUser');

    let debounceTimer;

    // Helper: Debounce function
    function debounce(func, delay) {
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // 1. Toggle Search Bar
    if (searchToggle) {
        searchToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isActive = iconsChip.classList.contains('search-active');

            if (!isActive) {
                // Expand logic
                iconsChip.classList.add('search-active');
                searchInput.focus();
            } else {
                // Collapse logic
                collapseSearch();
            }
        });
    }

    function collapseSearch() {
        if (iconsChip) iconsChip.classList.remove('search-active');
        if (searchResults) searchResults.classList.add('d-none');
        if (searchInput) searchInput.value = '';
    }

    // 2. Debounced Search Input Logic
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async () => {
            const query = searchInput.value.trim();
            
            if (query.length < 2) {
                searchResults.classList.add('d-none');
                return;
            }

            try {
                const baseUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
                const res = await fetch(`${baseUrl}/api/products/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) throw new Error('Search API failed');
                
                const products = await res.json();
                renderResults(products);
            } catch (err) {
                console.error('Search request error:', err);
            }
        }, 300));
    }

    // 3. Render Results Dropdown
    function renderResults(products) {
        if (!searchResults) return;

        searchResults.innerHTML = '';
        
        if (products.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No components found.</div>';
        } else {
            products.forEach(product => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                
                const fallbackImg = 'https://via.placeholder.com/35/252530/ffffff?text=PC';
                const imgSrc = product.image && product.image !== '' ? product.image : fallbackImg;

                item.innerHTML = `
                    <img src="${imgSrc}" alt="${product.name}">
                    <span>${product.name}</span>
                `;
                
                item.addEventListener('click', () => {
                    const productType = product.type || 'unknown';
                    window.location.href = `product.html?id=${product.id}&type=${productType}`;
                });
                
                searchResults.appendChild(item);
            });
        }
        
        searchResults.classList.remove('d-none');
    }

    // 4. Global Close Events
    document.addEventListener('click', (e) => {
        if (iconsChip && !iconsChip.contains(e.target) && !searchToggle.contains(e.target)) {
            collapseSearch();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            collapseSearch();
        }
    });
    
    if (searchResults) {
        searchResults.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});
