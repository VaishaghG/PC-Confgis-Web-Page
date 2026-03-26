let selectedAddress = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    loadAddresses();
});

// API_BASE_URL is globally defined in config.js

// ── ADDRESS LOADING ──
async function loadAddresses() {
    const homeDisplay = document.getElementById('display-home-address');
    const officeDisplay = document.getElementById('display-office-address');
    const officeContainer = document.getElementById('office-option-container');
    const checkoutBtn = document.getElementById('main-checkout-btn');

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/profile`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();

        const home = data.addresses?.home;
        const office = data.addresses?.office;

        if (!home) {
            homeDisplay.innerHTML = '<span class="text-danger">No home address set. <a href="dashboard.html">Update Profile</a></span>';
            if (checkoutBtn) checkoutBtn.disabled = true;
            return;
        }

        homeDisplay.textContent = home;

        if (office && office.trim()) {
            officeDisplay.textContent = office;
            officeContainer.classList.remove('d-none');
        }

        // Listen for changes
        document.querySelectorAll('input[name="deliveryAddress"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                selectedAddress = e.target.value;
                // Enable checkout if it was disabled due to no selection
                // (though subtotal check also controls it)
            });
        });

    } catch (err) {
        console.error("Error loading addresses:", err);
    }
}

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
            window.location.href = `${FRONTEND_BASE_URL}/login.html?redirect=${encodeURIComponent(window.location.href)}&error=unauth`;
            return;
        }
        
        const data = await res.json();
        window.currentCartData = data;
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
        const detailedBuilds = await Promise.all(builds.map(async build => {
            const components = build.components || {
                cpu: build.cpu || '',
                gpu: build.gpu || '',
                ram: build.ram || '',
                storage: build.storage || '',
                cabinet: build.cabinet || ''
            };
            console.log("BUILD CABINET DATA:", components.cabinet);

            let cabinetImage = "images/default-case.png";
            if (components.cabinet && components.cabinet.image) {
                 cabinetImage = API_BASE_URL + "/" + components.cabinet.image;
            }
            
            return {
                _id: build._id,
                name: build.name || 'Custom PC Build',
                components,
                cabinetImage,
                price: typeof build.price === 'number' ? build.price : 0
            };
        }));
        
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
                            <button class="btn-checkout-item" onclick="checkoutSingleItem('${encodeURIComponent(JSON.stringify(item))}')">
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

            html += `
                <div class="cart-build">
                    <img src="${build.cabinetImage || ''}" class="cabinet-img" alt="Cabinet">
                    <div class="build-details">
                        <div class="build-header">
                            <h3 class="build-title">${build.name || 'Custom PC Build'}</h3>
                            <div class="cart-item-price">$${buildPrice.toFixed(2)}</div>
                        </div>
                        <div class="build-specs-list">
                            ${specsHtml || '<div class="text-muted small">Please complete the build before adding to cart.</div>'}
                        </div>
                        <div class="build-group-actions mt-3">
                            <button class="btn-checkout-build" onclick="checkoutSingleBuild('${encodeURIComponent(JSON.stringify(build))}')">
                                Proceed to Checkout Build
                            </button>
                            <button class="btn-remove-build" onclick="removeBuild('${build._id}')">
                                Remove Build
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    listEl.innerHTML = html;
    updateSummary(subtotal, totalItems);
}

function updateSummary(subtotal, totalItems) {
    const subtotalEl = document.getElementById('summary-subtotal');
    const totalEl = document.getElementById('summary-total');
    
    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${subtotal.toFixed(2)}`;

    // Store in localStorage as fallback for payment page
    localStorage.setItem('paymentTotal', subtotal.toFixed(2));
    localStorage.setItem('paymentItemCount', totalItems || 0);

    // Wire the main checkout button
    const checkoutBtn = document.getElementById('main-checkout-btn');
    if (checkoutBtn) {
        if (subtotal > 0) {
            checkoutBtn.disabled = false;
            checkoutBtn.onclick = () => {
                checkoutFullCart();
            };
        } else {
            checkoutBtn.disabled = true;
        }
    }
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
    updateSummary(0, 0);
}

function renderLoading() {
    document.getElementById('cart-list').innerHTML = `
        <div id="cart-loading" class="text-center py-5 text-muted">
            <div class="spinner-border text-light mb-3" role="status"></div>
            <p>Loading your cart...</p>
        </div>
    `;
}

// ── DISTINCT CHECKOUT FLOWS ──
window.checkoutSingleItem = function(itemStr) {
    if (!selectedAddress) {
        showNotification("Please select a delivery address before checkout.", "warning");
        return;
    }
    const item = JSON.parse(decodeURIComponent(itemStr));
    localStorage.setItem("checkoutMode", "single-item");
    localStorage.setItem("checkoutData", JSON.stringify({
        items: [item],
        builds: [],
        totalAmount: item.price * (item.quantity || 1),
        deliveryAddress: selectedAddress
    }));
    window.location.href = "payment.html";
};

window.checkoutSingleBuild = function(buildStr) {
    if (!selectedAddress) {
        showNotification("Please select a delivery address before checkout.", "warning");
        return;
    }
    const build = JSON.parse(decodeURIComponent(buildStr));
    localStorage.setItem("checkoutMode", "single-build");
    localStorage.setItem("checkoutData", JSON.stringify({
        items: [],
        builds: [build],
        totalAmount: typeof build.price === 'number' ? build.price : 0,
        deliveryAddress: selectedAddress
    }));
    window.location.href = "payment.html";
};

window.checkoutFullCart = function() {
    if (!selectedAddress) {
        showNotification("Please select a delivery address before checkout.", "warning");
        return;
    }
    if (!window.currentCartData) return;
    const items = window.currentCartData.individualItems || [];
    const builds = window.currentCartData.builds || [];
    let total = 0;
    items.forEach(i => total += (i.price * (i.quantity || 1)));
    builds.forEach(b => total += (typeof b.price === 'number' ? b.price : 0));

    localStorage.setItem("checkoutMode", "full-cart");
    localStorage.setItem("checkoutData", JSON.stringify({
        items: items,
        builds: builds,
        totalAmount: total,
        deliveryAddress: selectedAddress
    }));
    window.location.href = "payment.html";
};
