// API_BASE_URL is globally defined in config.js

/* ── Guard: redirect to login if not authenticated ── */
async function guardAuth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = `${FRONTEND_BASE_URL}/login.html?redirect=${encodeURIComponent(FRONTEND_BASE_URL + '/dashboard.html')}`;
    }
  } catch {
    window.location.href = `${FRONTEND_BASE_URL}/login.html`;
  }
}

/* ── Sidebar section switching ── */
function initSidebar() {
  document.querySelectorAll('.sidebar-link[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.section;

      // Active state
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show section
      document.querySelectorAll('.dash-section').forEach(s => s.classList.remove('active'));
      document.getElementById(`section-${target}`)?.classList.add('active');

      // Lazy-load builds
      if (target === 'builds') loadBuilds();
      if (target === 'orders') loadOrders();
    });
  });
}

/* ── Make initials from name ── */
function initials(name) {
  if (!name) return '??';
  return name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isValidPhone(phone) {
  if (!phone) return true; // Optional field
  return /^\d{10}$/.test(normalizePhone(phone));
}

function initPhoneInputRestriction() {
  const phoneInput = document.getElementById('edit-phone');
  if (!phoneInput) return;

  const sanitize = () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
  };

  phoneInput.addEventListener('input', sanitize);
  phoneInput.addEventListener('paste', () => setTimeout(sanitize, 0));
}

/* ── Load profile ── */
async function loadProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/profile`, { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();

    const abbr = initials(data.name);

    // Sidebar
    document.getElementById('sidebar-avatar').textContent = abbr;
    document.getElementById('sidebar-name').textContent = data.name || '—';
    if (document.getElementById('navUser')) {
      document.getElementById('navUser').textContent = `Welcome, ${data.name}`;
    }

    // Profile view
    document.getElementById('profile-avatar-large').textContent = abbr;
    document.getElementById('profile-name-display').textContent = data.name || '—';
    document.getElementById('profile-email-display').textContent = data.email || '—';
    document.getElementById('pf-name').textContent = data.name || '—';
    document.getElementById('pf-email').textContent = data.email || '—';
    document.getElementById('pf-phone').textContent = data.phone || 'Not set';
    document.getElementById('pf-dob').textContent = data.dob || 'Not set';
    document.getElementById('pf-home-address').textContent = data.addresses?.home || 'Not set';
    document.getElementById('pf-office-address').textContent = data.addresses?.office || 'Not set';

    // Pre-fill edit form
    document.getElementById('edit-name').value = data.name || '';
    document.getElementById('edit-phone').value = data.phone || '';
    document.getElementById('edit-dob').value = data.dob || '';
    document.getElementById('edit-home-address').value = data.addresses?.home || '';
    document.getElementById('edit-office-address').value = data.addresses?.office || '';
  } catch (err) {
    console.error('Profile load error:', err);
  }
}

/* ── Edit profile toggle ── */
function initEditProfile() {
  const btnEdit = document.getElementById('btn-edit-profile');
  const btnCancel = document.getElementById('btn-cancel-edit');
  const viewEl = document.getElementById('profile-view');
  const formEl = document.getElementById('profile-edit-form');
  const msgEl = document.getElementById('edit-msg');

  btnEdit?.addEventListener('click', () => {
    viewEl.classList.add('d-none');
    formEl.classList.remove('d-none');
    btnEdit.classList.add('d-none');
    msgEl.classList.add('d-none');
  });

  btnCancel?.addEventListener('click', () => {
    viewEl.classList.remove('d-none');
    formEl.classList.add('d-none');
    btnEdit.classList.remove('d-none');
  });

  formEl?.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('edit-name').value.trim();
    const rawPhone = document.getElementById('edit-phone').value;
    const dob = document.getElementById('edit-dob').value;
    const home = document.getElementById('edit-home-address').value.trim();
    const office = document.getElementById('edit-office-address').value.trim();

    if (!isValidPhone(rawPhone)) {
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'Enter a valid 10-digit phone number.';
      msgEl.classList.remove('d-none');
      return;
    }

    if (!home) {
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'Home address is required.';
      msgEl.classList.remove('d-none');
      return;
    }

    try {
      // 1. Update basic profile
      const profileRes = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, phone: normalizePhone(rawPhone), dob })
      });

      // 2. Update addresses
      const addressRes = await fetch(`${API_BASE_URL}/api/user/address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ home, office })
      });

      if (profileRes.ok && addressRes.ok) {
        msgEl.className = 'edit-msg success';
        msgEl.textContent = 'Profile updated!';
        msgEl.classList.remove('d-none');
        loadProfile();
        // Switch back to view mode after a short delay
        setTimeout(() => {
          viewEl.classList.remove('d-none');
          formEl.classList.add('d-none');
          btnEdit?.classList.remove('d-none');
        }, 1500);
      } else {
        const data = await profileRes.json();
        msgEl.className = 'edit-msg error';
        msgEl.textContent = data.message || 'Update failed';
        msgEl.classList.remove('d-none');
      }
    } catch (err) {
      console.error(err);
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'Network error. Try again.';
      msgEl.classList.remove('d-none');
    }
  });
}

/* ── Logout ── */
function initLogout() {
  document.getElementById('btn-logout')?.addEventListener('click', async e => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      // Clear all storage on logout per security requirements
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = `${FRONTEND_BASE_URL}/index.html`;
  });
}

/* ── Load PC Builds ── */
async function loadBuilds() {
  const listEl = document.getElementById('builds-list');
  const emptyEl = document.getElementById('builds-empty');
  const loadingEl = document.getElementById('builds-loading');

  if (!listEl) return;

  listEl.innerHTML = '';
  emptyEl?.classList.add('d-none');
  loadingEl?.classList.remove('d-none');

  try {
    const res = await fetch(`${API_BASE_URL}/api/builds/my`, { credentials: 'include' });
    const builds = await res.json();

    loadingEl?.classList.add('d-none');

    if (!Array.isArray(builds) || builds.length === 0) {
      emptyEl?.classList.remove('d-none');
      return;
    }

    for (const [i, build] of builds.entries()) {
      console.log("BUILD CABINET DATA:", build.cabinet);
      
      const cabinetName = typeof build.cabinet === 'object' ? build.cabinet.name : build.cabinet;
      let cabinetImage = "";

      if (build.cabinet && build.cabinet.image) {
        cabinetImage = API_BASE_URL + "/" + build.cabinet.image;
      } else {
        console.error("❌ Missing cabinet image for build:", build);
        cabinetImage = API_BASE_URL + "/images/default-case.png"; // ONLY fallback AFTER error log
      }

      const specs = [
        { label: 'CPU', value: build.cpu },
        { label: 'GPU', value: build.gpu },
        { label: 'RAM', value: build.ram },
        { label: 'Storage', value: build.storage },
        { label: 'Cabinet', value: cabinetName },
      ].filter(s => s.value);

      const specsHTML = specs.map(s =>
        `<li><span class="spec-label">${s.label}</span><span class="spec-value">${s.value}</span></li>`
      ).join('');

      const card = document.createElement('div');
      card.className = 'build-card';
      card.innerHTML = `
        <div class="build-header">
            <img src="${cabinetImage}" class="cabinet-img" alt="Cabinet Image">
            <div class="build-info">
                <div class="build-number">Build #${i + 1}${build.name ? ' — ' + build.name : ''}</div>
                <ul class="build-specs">${specsHTML || '<li><span class="spec-value">No components saved.</span></li>'}</ul>
            </div>
        </div>
        <div class="build-actions">
          <button class="btn-build-add-cart" data-id="${build._id}" data-cpu="${build.cpu}" data-gpu="${build.gpu}" data-ram="${build.ram}" data-storage="${build.storage}" data-cabinet="${cabinetName}">
            <i class="bi bi-cart-plus me-1"></i>Add Build to Cart
          </button>
          <button class="btn-build-delete" data-id="${build._id}">
            <i class="bi bi-trash me-1"></i>Delete
          </button>
        </div>
      `;
      listEl.appendChild(card);
    }

    // Wire add to cart buttons
    listEl.querySelectorAll('.btn-build-add-cart').forEach(btn => {
      btn.addEventListener('click', async () => {
        const buildId = btn.dataset.id;
        await addBuildToCart(buildId, btn);
      });
    });

    // Wire delete buttons
    listEl.querySelectorAll('.btn-build-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        showConfirmation('Are you sure you want to delete this build? This cannot be undone.', async () => {
            btn.disabled = true;
            try {
              const res = await fetch(`${API_BASE_URL}/api/builds/${btn.dataset.id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              if (res.ok) {
                showNotification('Build deleted successfully.', 'success');
                loadBuilds();
              } else {
                btn.disabled = false;
                showNotification('Failed to delete build.', 'error');
              }
            } catch {
              btn.disabled = false;
              showNotification('Network error.', 'error');
            }
        });
      });
    });

  } catch (err) {
    loadingEl?.classList.add('d-none');
    listEl.innerHTML = '<p class="text-muted text-center py-4">Failed to load builds.</p>';
  }
}

/* ── Load Orders ── */
async function loadOrders() {
  const listEl   = document.getElementById('orders-list');
  const emptyEl  = document.getElementById('orders-empty');
  const loadingEl = document.getElementById('orders-loading');

  if (!listEl) return;

  listEl.innerHTML = '';
  emptyEl?.classList.add('d-none');
  loadingEl?.classList.remove('d-none');

  try {
    const res = await fetch(`${API_BASE_URL}/api/orders/my`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch orders');
    const orders = await res.json();

    loadingEl?.classList.add('d-none');

    if (!Array.isArray(orders) || orders.length === 0) {
      emptyEl?.classList.remove('d-none');
      return;
    }

    orders.forEach((order, idx) => {
      const dateStr = order.createdAt
        ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

      let buildsHTML = '';
      if (Array.isArray(order.builds) && order.orderId) { // Just making sure it's valid
        order.builds.forEach((build, bi) => {
          const cabinetName = (build.cabinet && build.cabinet.name) ? build.cabinet.name : 'Cabinet';
          let cabinetImage = '';
          if (build.cabinet && build.cabinet.image) {
            cabinetImage = `${API_BASE_URL}/${build.cabinet.image}`;
          } else {
            cabinetImage = `${API_BASE_URL}/images/default-case.png`;
          }

          const specs = [
            { key: 'cpu', label: 'CPU', value: build.cpu },
            { key: 'gpu', label: 'GPU', value: build.gpu },
            { key: 'ram', label: 'RAM', value: build.ram },
            { key: 'storage', label: 'STORAGE', value: build.storage },
            { key: 'cabinet', label: 'CABINET', value: cabinetName },
          ].filter(s => s.value);

          const specsHTML = specs.map(s => `
            <div class="build-spec-item">
                <span class="build-spec-label">${s.label}</span>
                <span class="build-spec-name" title="${s.value}">${s.value}</span>
            </div>
          `).join('');

          const buildPrice = typeof build.price === 'number' ? build.price : 0;
          const buildName = build.name && build.name !== 'Custom PC Build' ? build.name : 'Custom PC Build';

          buildsHTML += `
            <div class="order-build-card">
              <div class="build-left">
                <img src="${cabinetImage}" class="cabinet-img" alt="Cabinet" onerror="this.src='${API_BASE_URL}/images/default-case.png'" />
              </div>
            
              <div class="build-right">
                <h3 class="build-title-header">${buildName}</h3>
            
                <div class="build-specs">
                  ${build.cpu ? `<div><span class="spec-lbl">CPU</span> <span class="spec-val">${build.cpu}</span></div>` : ''}
                  ${build.gpu ? `<div><span class="spec-lbl">GPU</span> <span class="spec-val">${build.gpu}</span></div>` : ''}
                  ${build.ram ? `<div><span class="spec-lbl">RAM</span> <span class="spec-val">${build.ram}</span></div>` : ''}
                  ${build.storage ? `<div><span class="spec-lbl">Storage</span> <span class="spec-val">${build.storage}</span></div>` : ''}
                  <div><span class="spec-lbl">Cabinet</span> <span class="spec-val">${cabinetName}</span></div>
                </div>
              </div>
            
              <div class="build-price-tag">
                $${buildPrice.toFixed(2)}
              </div>
            </div>
          `;
        });
      }

      let itemsHTML = '';
      if (Array.isArray(order.items) && order.items.length > 0) {
        itemsHTML = order.items.map(item => {
          if (item.type === 'build') {
            // Render BUILD snapshot
            const cabinetName = item.cabinet?.name || 'Cabinet';
            const cabinetImage = item.cabinet?.image 
              ? `${API_BASE_URL}/${item.cabinet.image}` 
              : `${API_BASE_URL}/images/default-case.png`;
            
            return `
              <div class="order-build-card">
                <div class="build-left">
                  <img src="${cabinetImage}" class="cabinet-img" alt="Cabinet" onerror="this.src='${API_BASE_URL}/images/default-case.png'" />
                </div>
                <div class="build-right">
                  <h3 class="build-title-header">${item.name || 'Custom PC Build'}</h3>
                  <div class="build-specs">
                    ${item.cpu ? `<div><span class="spec-lbl">CPU</span> <span class="spec-val">${item.cpu}</span></div>` : ''}
                    ${item.gpu ? `<div><span class="spec-lbl">GPU</span> <span class="spec-val">${item.gpu}</span></div>` : ''}
                    ${item.ram ? `<div><span class="spec-lbl">RAM</span> <span class="spec-val">${item.ram}</span></div>` : ''}
                    ${item.storage ? `<div><span class="spec-lbl">Storage</span> <span class="spec-val">${item.storage}</span></div>` : ''}
                    <div><span class="spec-lbl">Cabinet</span> <span class="spec-val">${cabinetName}</span></div>
                  </div>
                </div>
                <div class="build-price-tag">
                  $${(parseFloat(item.price) || 0).toFixed(2)}
                </div>
              </div>`;
          } else {
            // Render NORMAL item
            const itemImg = item.image ? `${API_BASE_URL}/${item.image}` : `${API_BASE_URL}/images/default-item.png`;
            const itemTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
            return `
              <div class="cart-item">
                  <img src="${itemImg}" alt="${item.name}" class="cart-item-img" onerror="this.src='${API_BASE_URL}/images/default-item.png'">
                  <div class="cart-item-details">
                      <span class="cart-item-category">${(item.productType || 'item').toUpperCase()}</span>
                      <h3 class="cart-item-title">${item.name || item.productId || 'Unknown Product'}</h3>
                      <div class="cart-item-actions">
                          <span class="qty-value text-muted">Qty: ${item.quantity || 1}</span>
                      </div>
                  </div>
                  <div class="cart-item-price">$${itemTotal.toFixed(2)}</div>
              </div>`;
          }
        }).join('');
      }

      const card = document.createElement('div');
      card.className = 'order-card glass-card';
      card.innerHTML = `
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id"><i class="bi bi-bag-check me-1"></i>${order.orderId || ('ORD-' + order._id.slice(-8).toUpperCase())}</span>
            <span class="order-date"><i class="bi bi-calendar3 me-1"></i>${dateStr}</span>
          </div>
          <div class="order-total">$${parseFloat(order.totalAmount || 0).toFixed(2)}</div>
        </div>
        <div class="order-status-badge status-${(order.status || 'paid').toLowerCase()}">${(order.status || 'Paid').toUpperCase()}</div>
        ${buildsHTML ? `<div class="order-builds-list">${buildsHTML}</div>` : ''}
        ${itemsHTML  ? `<div class="order-items-list">${itemsHTML}</div>` : ''}
      `;
      listEl.appendChild(card);
    });

  } catch (err) {
    loadingEl?.classList.add('d-none');
    console.error('Load orders error:', err);
    listEl.innerHTML = '<p class="text-muted text-center py-4">Failed to load orders. Please try again.</p>';
  }
}

/* ── Change Password ── */
function initChangePassword() {
  const form = document.getElementById('password-form');
  const msgEl = document.getElementById('pw-msg');

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const current = document.getElementById('pw-current').value;
    const newPw = document.getElementById('pw-new').value;
    const confirm = document.getElementById('pw-confirm').value;

    if (newPw !== confirm) {
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'New passwords do not match.';
      msgEl.classList.remove('d-none');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: newPw })
      });
      const data = await res.json();
      msgEl.className = 'edit-msg ' + (res.ok ? 'success' : 'error');
      msgEl.textContent = res.ok ? 'Password updated!' : (data.message || 'Failed to update.');
      msgEl.classList.remove('d-none');
      if (res.ok) {
        form.reset();
        resetPasswordToggleState(form);
      }
    } catch {
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'Network error. Try again.';
      msgEl.classList.remove('d-none');
    }
  });
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

function resetPasswordToggleState(scope = document) {
  scope.querySelectorAll('[data-password-input]').forEach((input) => {
    input.type = 'password';
  });
  scope.querySelectorAll('[data-password-toggle]').forEach((btn) => {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.classList.remove('bi-eye-slash');
      icon.classList.add('bi-eye');
    }
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Show password');
  });
}

/**
 * Adds a full PC build to the cart after validation
 */
async function addBuildToCart(buildId, btnEl = null) {
  if (btnEl) {
    const { cpu, gpu, ram, storage, cabinet } = btnEl.dataset;
    
    // Validation as requested: verify all 5 components exist
    if (!cpu || !gpu || !ram || !storage || !cabinet) {
        showNotification("Please complete the build before adding to cart.", "warning");
        return;
    }

    btnEl.disabled = true;
    btnEl.textContent = 'Adding...';
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/cart/add-build`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ buildId })
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Build added to cart!", "success");
      setTimeout(() => {
        window.location.href = `${FRONTEND_BASE_URL}/cart.html`;
      }, 1500);
    } else {
      showNotification(data.message || "Failed to add build to cart", "error");
    }
  } catch (err) {
    console.error('Add build to cart error:', err);
    showNotification("Network error. Please try again.", "error");
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = '<i class="bi bi-cart-plus me-1"></i>Add Build to Cart';
    }
  }
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async () => {
  await guardAuth();
  initSidebar();
  initLogout();
  initEditProfile();
  initPhoneInputRestriction();
  initPasswordToggles();
  initChangePassword();
  loadProfile();

  // Check URL hash for direct section navigation
  const hash = window.location.hash;
  if (hash) {
      const section = hash.replace('#section-', '').replace('#', '');
      const link = document.querySelector(`.sidebar-link[data-section="${section}"]`);
      if (link) link.click();
  }
});
