document.addEventListener('DOMContentLoaded', () => {
    loadCart();
});

// API_BASE_URL is globally defined in config.js

const TYPE_CONFIG = {
    cpu: { endpoint: 'cpus', nameField: 'cpuname', imgField: 'imgpath', fallbackName: 'CPU Processor' },
    gpu: { endpoint: 'gpus', nameField: 'gpuname', imgField: 'imgpath', fallbackName: 'Graphics Card' },
    ram: { endpoint: 'rams', nameField: 'ramname', imgField: 'imgpath', fallbackName: 'Memory RAM' },
    storage: { endpoint: 'storages', nameField: 'storagename', imgField: 'imgpath', fallbackName: 'Storage Drive' },
    cabinet: { endpoint: 'cabinets', nameField: 'brand', imgField: 'imgpath', fallbackName: 'PC Cabinet' }
};

// ── FETCH CART ──
async function loadCart() {
    const listEl = document.getElementById('cart-list');
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/cart`, {credentials: 'include'});
        
        if (res.status === 401) {
            window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}&error=unauth`;
            return;
        }
        
        const data = await res.json();
        const individualItems = data.individualItems || [];
        const builds = data.builds || [];
        
        if (individualItems.length === 0 && builds.length === 0) {
            renderEmptyCart();
            return;
        }

        renderLoading();
        
        // 1. Fetch details for individual items
        const detailedIndividual = [];
        for (const item of individualItems) {
            const config = TYPE_CONFIG[item.productType];
            if (!config) continue;
            try {
                const pRes = await fetch(`${API_BASE_URL}/${config.endpoint}/${item.productId}`);
                if (!pRes.ok) continue;
                const dbProd = await pRes.json();
                detailedIndividual.push({
                    _id: item.productId,
                    type: item.productType,
                    quantity: item.quantity,
                    name: dbProd[config.nameField] || dbProd.Brand || config.fallbackName,
                    price: parseFloat(dbProd.price) || 0,
                    image: dbProd[config.imgField] || 'https://via.placeholder.com/150'
                });
            } catch (err) { console.error('Error fetching individual product', err); }
        }

        // 2. Fetch details for builds (we need prices for each component to get a total)
        // For simplicity in this step, we'll just display the names saved in the build object
        // and fetch prices to show a "Build Estimate".
        const detailedBuilds = builds.map(build => {
            const components = build.components || {
                cpu: build.cpu || '',
                gpu: build.gpu || '',
                ram: build.ram || '',
                storage: build.storage || '',
                cabinet: build.cabinet || ''
            };

            return {
                _id: build._id,
                name: build.name || 'Custom PC Build',
                components,
                price: typeof build.price === 'number' ? build.price : 0
            };
        });
        
        renderCart(detailedIndividual, detailedBuilds);

    } catch (err) {
        console.error('Cart load error:', err);
        listEl.innerHTML = `<div class="p-5 text-center text-danger">Failed to load cart.</div>`;
    }
}

// ── RENDER CART ──
function renderCart(individuals, builds) {
    const listEl = document.getElementById('cart-list');
    const countEl = document.getElementById('cart-count');
    
    const totalItems = individuals.reduce((sum, item) => sum + item.quantity, 0) + builds.length;
    countEl.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;
    
    let html = '';
    let subtotal = 0;

    // SECTION 1: Individual Items
    if (individuals.length > 0) {
        html += `<div class="cart-section-title">Individual Components</div>`;
        individuals.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            html += `
                <div class="cart-item">
                    <img src="${item.image}" alt="Product" class="cart-item-img">
                    <div class="cart-item-details">
                        <span class="cart-item-category">${item.type.toUpperCase()}</span>
                        <h3 class="cart-item-title">${item.name}</h3>
                        <div class="cart-item-actions">
                            <span class="qty-value text-muted">Qty: ${item.quantity}</span>
                            <button class="btn-checkout-item" onclick="showNotification('Proceeding to checkout for ${item.name.replace(/'/g, "\\'")}...', 'info')">
                                <i class="bi bi-credit-card"></i> Proceed to Checkout
                            </button>
                            <button class="btn-remove" onclick="removeIndividual('${item._id}')">
                                <i class="bi bi-trash3"></i> Remove
                            </button>
                        </div>
                    </div>
                    <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
                </div>
            `;
        });
    }

    // SECTION 2: PC Builds
    if (builds.length > 0) {
        html += `<div class="cart-section-title">Saved PC Builds</div>`;
        const order = ['cpu', 'gpu', 'ram', 'storage', 'cabinet'];
        builds.forEach(build => {
            const buildPrice = typeof build.price === 'number' ? build.price : 0;
            subtotal += buildPrice;
            const safeBuildName = (build.name || 'Custom PC Build').replace(/'/g, "\\'");

            const specsHtml = order.map(key => {
                const value = build.components?.[key];
                let displayValue = (key === 'cabinet' && typeof value === 'object' && value) ? value.name : value;
                
                if (!displayValue) return '';
                return `
                    <div class="build-spec-item">
                        <span class="build-spec-label">${key.toUpperCase()}</span>
                        <span class="build-spec-name" title="${displayValue}">${displayValue}</span>
                    </div>
                `;
            }).filter(Boolean).join('');

            const cabinetImage = (build.components?.cabinet && typeof build.components.cabinet === 'object' && build.components.cabinet.image) 
                ? build.components.cabinet.image 
                : 'images/default-case.png';

            html += `
                <div class="cart-build">
                    <div class="build-top">
                        <img src="${cabinetImage}" class="cabinet-img" alt="Cabinet">
                        <div class="build-components">
                            <div class="build-header">
                                <h3 class="build-title">${build.name || 'Custom PC Build'}</h3>
                                <div class="cart-item-price">$${buildPrice.toFixed(2)}</div>
                            </div>
                            <div class="build-specs-list">
                                ${specsHtml || '<div class="text-muted small">Please complete the build before adding to cart.</div>'}
                            </div>
                        </div>
                    </div>
                    <div class="build-group-actions p-3 pt-0">
                        <button class="btn-checkout-build" onclick="showNotification('Proceeding to checkout for ${safeBuildName}...', 'info')">
                            Proceed to Checkout Build
                        </button>
                        <button class="btn-remove-build" onclick="removeBuild('${build._id}')">
                            Remove Build
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    listEl.innerHTML = html;
    updateSummary(subtotal);
}

function updateSummary(subtotal) {
    document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('summary-total').textContent = `$${subtotal.toFixed(2)}`;
}

async function removeIndividual(cartItemId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/cart/item/${cartItemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (res.ok) loadCart();
    } catch (err) { console.error('Remove individual error', err); }
}

async function removeBuild(cartBuildId) {
    showConfirmation('Remove this build from cart?', async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/cart/build/${cartBuildId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                showNotification('Build removed from cart.', 'success');
                loadCart();
            }
        } catch (err) { 
            console.error('Remove build error', err); 
            showNotification('Failed to remove build.', 'error');
        }
    });
}

function renderEmptyCart() {
    document.getElementById('cart-count').textContent = '0 items';
    document.getElementById('cart-list').innerHTML = `
        <div class="empty-cart">
            <i class="bi bi-cart-x"></i>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything to your cart yet.</p>
            <a href="index.html" class="btn-auth btn-primary d-inline-block px-4 w-auto">Start Building</a>
        </div>
    `;
    updateSummary(0);
}

function renderLoading() {
    document.getElementById('cart-list').innerHTML = `
        <div id="cart-loading" class="text-center py-5 text-muted">
            <div class="spinner-border text-light mb-3" role="status"></div>
            <p>Loading your cart...</p>
        </div>
    `;
}
