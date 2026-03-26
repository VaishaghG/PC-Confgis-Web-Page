// API_BASE_URL is globally defined in config.js

/* ── Guard: redirect to login if not authenticated ── */
async function guardAuth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
    const data = await res.json();
    if (!data.loggedIn) {
      window.location.href = 'login.html?redirect=/frontend/dashboard.html';
    }
  } catch {
    window.location.href = 'login.html';
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
    document.getElementById('pf-address').textContent = data.address || 'Not set';

    // Pre-fill edit form
    document.getElementById('edit-name').value = data.name || '';
    document.getElementById('edit-phone').value = data.phone || '';
    document.getElementById('edit-dob').value = data.dob || '';
    document.getElementById('edit-address').value = data.address || '';
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
    const rawPhone = document.getElementById('edit-phone').value;
    if (!isValidPhone(rawPhone)) {
      msgEl.className = 'edit-msg error';
      msgEl.textContent = 'Enter a valid phone number (10-15 digits, optional +country code).';
      msgEl.classList.remove('d-none');
      return;
    }

    const body = {
      username: document.getElementById('edit-name').value.trim(),
      phone: normalizePhone(rawPhone),
      dob: document.getElementById('edit-dob').value,
      address: document.getElementById('edit-address').value.trim(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/update-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      msgEl.className = 'edit-msg ' + (res.ok ? 'success' : 'error');
      msgEl.textContent = res.ok ? 'Profile updated!' : (data.message || 'Update failed');
      msgEl.classList.remove('d-none');
      if (res.ok) loadProfile();
    } catch {
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
      // Clear build storage on logout
      localStorage.removeItem('selectedBuild');
      localStorage.removeItem('currentBuild');
      sessionStorage.removeItem('selectedBuild');
      sessionStorage.removeItem('currentBuild');
    } catch {}
    window.location.href = 'index.html';
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

    builds.forEach((build, i) => {
      const cabinetName = typeof build.cabinet === 'object' ? build.cabinet.name : build.cabinet;
      const cabinetImage = (typeof build.cabinet === 'object' && build.cabinet.image) ? build.cabinet.image : 'images/default-case.png';

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
    });

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
        window.location.href = "/frontend/cart.html";
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
