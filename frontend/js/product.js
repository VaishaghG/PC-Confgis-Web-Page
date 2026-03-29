/* =====================================================
   PRODUCT PAGE - product.js
   Reads ?id=...&type=... from URL, fetches from backend,
   and renders the Flipkart-style product detail layout.
   ===================================================== */

// API_BASE_URL is globally defined in config.js

/* Field maps per product type */
const TYPE_CONFIG = {
  cpu: {
    label: 'CPU',
    route: 'cpus',
    nameField: 'cpuname',
    specs: {
      'Cores': 'cores',
      'Threads': 'threads',
      'Base Speed': 'basespeed',
      'Turbo Speed': 'turbospeed',
      'Max Memory': 'memory'
    }
  },
  gpu: {
    label: 'GPU',
    route: 'gpus',
    nameField: 'gpuname',
    specs: {
      'Memory': 'memory',
      'Base Clock': 'baseclock',
      'Boost Clock': 'clockspeed'
    }
  },
  ram: {
    label: 'RAM',
    route: 'rams',
    nameField: 'ramname',
    specs: {
      'Capacity': 'ramsize',
      'Type': 'ramtype',
      'Kit': d => d.quantity ? `${d.quantity}x stick(s)` : null,
      'Speed': 'ramspeed'
    }
  },
  storage: {
    label: 'Storage',
    route: 'storages',
    nameField: 'storagename',
    specs: {
      'Capacity': 'capacity',
      'Cache': 'cache'
    }
  },
  cabinet: {
    label: 'Cabinet',
    route: 'cabinets',
    nameField: 'brand',
    specs: {
      'Brand': 'brand',
      'Panel': 'panel',
      'Type': 'ctype',
      'Color': 'color'
    }
  }
};

/* Helpers */
function renderStars(rating) {
  const starsEl = document.getElementById('product-stars');
  const textEl = document.getElementById('product-rating-text');
  if (!rating) {
    document.getElementById('product-rating-row').style.display = 'none';
    return;
  }

  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  let html = '';

  for (let i = 0; i < full; i++) html += '<i class="bi bi-star-fill star"></i>';
  if (half) html += '<i class="bi bi-star-half star"></i>';
  for (let i = 0; i < empty; i++) html += '<i class="bi bi-star star empty"></i>';

  starsEl.innerHTML = html;
  textEl.textContent = `${rating} / 5`;
}

function renderSpecs(data, config) {
  const tbody = document.getElementById('specs-body');
  tbody.innerHTML = '';

  Object.entries(config.specs).forEach(([label, fieldOrFn]) => {
    let value;
    if (typeof fieldOrFn === 'function') {
      value = fieldOrFn(data);
    } else {
      value = data[fieldOrFn];
    }

    if (value === null || value === undefined || value === '') return;

    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="spec-key">${label}</td><td class="spec-val">${value}</td>`;
    tbody.appendChild(tr);
  });
}

function getDisplayName(data, config) {
  return (
    data[config.nameField] ||
    data.cpuname ||
    data.gpuname ||
    data.ramname ||
    data.storagename ||
    data.brand ||
    data.Brand ||
    data.name ||
    'Unknown Product'
  );
}

/* Main render */
function displayProduct(data, config) {
  const fallbackImg = 'https://via.placeholder.com/400x400?text=No+Image';
  const displayName = getDisplayName(data, config);

  document.title = `${displayName || 'Product'} - PC Configurator`;

  document.getElementById('product-img').src =
    data.imgpath && data.imgpath !== '' ? data.imgpath : fallbackImg;

  document.getElementById('product-img').alt = displayName || 'Product';
  document.getElementById('product-type-badge').textContent = config.label;
  document.getElementById('product-category').textContent = config.label;
  document.getElementById('product-name-breadcrumb').textContent = displayName || '-';
  document.getElementById('product-name').textContent = displayName;

  const price = data.price != null ? formatUsdAsInr(data.price) : 'N/A';
  document.getElementById('product-price').textContent = price;

  renderStars(data.rating);
  renderSpecs(data, config);

  document.getElementById('product-loading').classList.add('d-none');
  document.getElementById('product-content').classList.remove('d-none');
}

/* Fetch and bootstrap */
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const type = params.get('type');
  const config = TYPE_CONFIG[type];

  if (!id || !config) {
    document.getElementById('product-loading').classList.add('d-none');
    document.getElementById('product-error').classList.remove('d-none');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/${config.route}/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    displayProduct(data, config);

    setupActionButtons({
      id: id,
      type: type
    });
  } catch (err) {
    console.error('Failed to fetch product:', err);
    document.getElementById('product-loading').classList.add('d-none');
    document.getElementById('product-error').classList.remove('d-none');
  }
})();

// ACTION BUTTONS LOGIC (AUTH & CART)
function setupActionButtons(product) {
  const btnCart = document.getElementById('btn-cart');
  const btnAddToBuild = document.getElementById('btn-add-to-build');
  const productName = document.getElementById('product-name').textContent;

  (async () => {
    try {
      const authRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
      const authData = await authRes.json();
      if (!authData.loggedIn) return;

      const buildRes = await fetch(`${API_BASE_URL}/api/builds/current`, { credentials: 'include' });
      if (!buildRes.ok) return;
      const dbBuild = await buildRes.json();

      const cabinetName = dbBuild.cabinet && typeof dbBuild.cabinet === 'object'
        ? dbBuild.cabinet.name
        : dbBuild.cabinet;
      const currentVal = product.type === 'cabinet' ? cabinetName : dbBuild[product.type];

      if (currentVal === productName && btnAddToBuild) {
        btnAddToBuild.innerHTML = `<i class="bi bi-dash-circle me-2"></i>Remove from Build`;
        btnAddToBuild.classList.add('btn-danger');
      }
    } catch (err) {
      console.error('Failed to check build state:', err);
    }
  })();

  if (btnAddToBuild) {
    btnAddToBuild.addEventListener('click', async () => {
      await handleAuthCheck(async () => {
        let isRemoving = false;
        try {
          const buildRes = await fetch(`${API_BASE_URL}/api/builds/current`, { credentials: 'include' });
          if (buildRes.ok) {
            const dbBuild = await buildRes.json();
            const cabinetName = dbBuild.cabinet && typeof dbBuild.cabinet === 'object'
              ? dbBuild.cabinet.name
              : dbBuild.cabinet;
            const currentVal = product.type === 'cabinet' ? cabinetName : dbBuild[product.type];
            isRemoving = currentVal === productName;
          }
        } catch (e) {}

        const newSelection = isRemoving ? null : productName;

        try {
          await fetch(`${API_BASE_URL}/api/builds/update-current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: product.type, name: newSelection }),
            credentials: 'include'
          });
        } catch (err) {
          console.error('Failed to sync selection to backend:', err);
        }

        if (isRemoving) {
          btnAddToBuild.innerHTML = `<i class="bi bi-plus-circle me-2"></i>Add to Build`;
          btnAddToBuild.classList.remove('btn-danger');
          showNotification(`"${productName}" removed from your build.`);
        } else {
          btnAddToBuild.innerHTML = `<i class="bi bi-dash-circle me-2"></i>Remove from Build`;
          btnAddToBuild.classList.add('btn-danger');
          showNotification(`"${productName}" added to your build! \n\nPlease add all 5 components in the dashboard to save your full PC build.`, 'success');
        }
      });
    });
  }

  async function handleAuthCheck(actionFn) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
      const data = await res.json();

      if (data.loggedIn) {
        actionFn();
      } else {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `${FRONTEND_BASE_URL}/login.html?redirect=${encodeURIComponent(currentPath)}&error=unauth`;
      }
    } catch (err) {
      console.error('Auth check failed', err);
      showNotification('Network error. Please try again.', 'error');
    }
  }

  if (btnCart) {
    btnCart.addEventListener('click', () => {
      handleAuthCheck(() => addToCart());
    });
  }

  async function addToCart() {
    try {
      btnCart.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Adding...`;
      btnCart.disabled = true;

      const res = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          productType: product.type
        })
      });

      if (res.ok) {
        btnCart.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>Added`;
        btnCart.classList.add('btn-success');
        setTimeout(() => {
          btnCart.innerHTML = `<i class="bi bi-cart-plus me-2"></i>Add to Cart`;
          btnCart.classList.remove('btn-success');
          btnCart.disabled = false;
        }, 2000);
      } else {
        showNotification('Failed to add to cart', 'error');
        btnCart.innerHTML = `<i class="bi bi-cart-plus me-2"></i>Add to Cart`;
        btnCart.disabled = false;
      }
    } catch (err) {
      console.error(err);
      btnCart.innerHTML = `<i class="bi bi-cart-plus me-2"></i>Add to Cart`;
      btnCart.disabled = false;
    }
  }
}
