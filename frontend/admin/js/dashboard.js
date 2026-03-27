let currentCategory = 'cpu';
let currentProducts = [];
let currentSchema = [];
let selectedProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();
});

async function checkAdminAuth() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.role !== 'admin') {
        window.location.href = '/';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        const data = await res.json();

        if (!data.loggedIn) {
            localStorage.removeItem('user');
            alert('Session expired. Please log in again.');
            window.location.href = '/login.html';
            return;
        }

        if (data.role !== 'admin') {
            window.location.href = '/';
            return;
        }

        if (data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
        }

        setCategory('cpu');
    } catch (err) {
        console.error('Auth check error:', err);
        showNotification('Unable to verify admin session. Staying on this page for debugging.', 'error');
    }
}

function switchView(view) {
    document.querySelectorAll('.admin-main > .view-panel').forEach((section) => section.classList.add('d-none'));
    document.getElementById(`${view}-view`).classList.remove('d-none');

    document.querySelectorAll('.primary-nav-link').forEach((link) => link.classList.remove('active'));
    document.querySelector(`.primary-nav-link[data-view="${view}"]`).classList.add('active');

    if (view === 'analytics') {
        loadAnalytics();
    }
}

function setCategory(category) {
    currentCategory = category;

    document.querySelectorAll('.component-nav-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.category === category);
    });

    const badge = document.getElementById('categoryBadge');
    if (badge) {
        badge.textContent = category.toUpperCase();
    }

    loadCategoryData(category);
}

async function loadCategoryData(category) {
    showNotification(`Loading ${category.toUpperCase()} schema and products...`, 'info');

    try {
        const [schemaRes, productsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/schema/${category}`, { credentials: 'include' }),
            fetch(`${API_BASE_URL}/api/admin/products/${category}`, { credentials: 'include' })
        ]);

        const schemaData = await schemaRes.json();
        const productsData = await productsRes.json();

        currentSchema = schemaData.fields || [];
        currentProducts = productsData;

        clearForm();
    } catch (err) {
        console.error('Category load error:', err);
        showNotification('Failed to load category data.', 'error');
    }
}

function renderProductForm(product = {}) {
    const formContainer = document.getElementById('dynamic-form');
    if (!formContainer) {
        return;
    }

    formContainer.innerHTML = '';

    currentSchema.forEach((field) => {
        const wrapper = document.createElement('div');
        wrapper.className = `form-group${shouldSpanFullWidth(field.key) ? ' full-width' : ''}`;

        const label = document.createElement('label');
        label.setAttribute('for', `field-${field.key}`);
        label.textContent = formatFieldLabel(field.key);
        wrapper.appendChild(label);

        const value = product[field.key];

        if (isTextareaField(field.key)) {
            const textarea = document.createElement('textarea');
            textarea.id = `field-${field.key}`;
            textarea.className = 'form-control';
            textarea.dataset.fieldKey = field.key;
            textarea.dataset.fieldType = field.type;
            textarea.placeholder = `Enter ${formatFieldLabel(field.key).toLowerCase()}`;
            textarea.value = value ?? '';
            wrapper.appendChild(textarea);
        } else if (field.type === 'checkbox') {
            const checkboxWrap = document.createElement('label');
            checkboxWrap.className = 'checkbox-field';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `field-${field.key}`;
            checkbox.className = 'form-checkbox';
            checkbox.dataset.fieldKey = field.key;
            checkbox.dataset.fieldType = field.type;
            checkbox.checked = Boolean(value);

            const checkboxText = document.createElement('span');
            checkboxText.textContent = `Enable ${formatFieldLabel(field.key).toLowerCase()}`;

            checkboxWrap.appendChild(checkbox);
            checkboxWrap.appendChild(checkboxText);
            wrapper.appendChild(checkboxWrap);
        } else {
            const input = document.createElement('input');
            input.type = field.type === 'number' ? 'number' : 'text';
            input.id = `field-${field.key}`;
            input.className = 'form-control';
            input.dataset.fieldKey = field.key;
            input.dataset.fieldType = field.type;
            input.placeholder = `Enter ${formatFieldLabel(field.key).toLowerCase()}`;
            input.value = value ?? '';
            wrapper.appendChild(input);
        }

        formContainer.appendChild(wrapper);
    });
}

function renderProductList() {
    const list = document.getElementById('productList');
    if (!list) {
        return;
    }

    if (!currentProducts.length) {
        list.innerHTML = '<div class="empty-state">No products found in this category yet.</div>';
        return;
    }

    list.innerHTML = '';

    currentProducts.forEach((product) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `product-item${product._id === selectedProductId ? ' active' : ''}`;
        item.innerHTML = `
            <span class="product-item-name">${escapeHtml(getProductName(product))}</span>
            <span class="product-item-meta">${escapeHtml(getProductMeta(product))}</span>
        `;
        item.onclick = () => selectProduct(product);
        list.appendChild(item);
    });
}

function selectProduct(product) {
    console.log('Selected Product:', product);

    if (!product) {
        return;
    }

    selectedProductId = product._id;
    renderProductForm(product);
    syncImagePreview(product.imgpath || '');
    renderProductList();
}

function clearForm() {
    selectedProductId = null;
    renderProductForm(createEmptyProduct());

    const fileInput = document.getElementById('imageUpload');
    if (fileInput) {
        fileInput.value = '';
    }

    updateFileNameLabel();

    syncImagePreview('');
    renderProductList();
}

function openImagePicker() {
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) {
        fileInput.click();
    }
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        updateFileNameLabel(input.files[0].name);
        const preview = document.getElementById('imagePreview');
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(input.files[0]);
        return;
    }

    updateFileNameLabel();
}

function updateFileNameLabel(fileName = 'No file chosen') {
    const fileNameLabel = document.getElementById('imageFileName');
    if (fileNameLabel) {
        fileNameLabel.textContent = fileName;
    }
}

async function addProduct() {
    const file = document.getElementById('imageUpload').files[0];
    if (!file) {
        return showNotification('Please upload an image for new products.', 'warning');
    }

    const formData = new FormData();
    const payload = collectDynamicFields();

    Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
    });
    formData.append('image', file);

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/products/${currentCategory}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (res.ok) {
            showNotification('Product added successfully!', 'success');
            loadCategoryData(currentCategory);
        } else {
            showNotification('Failed to add product.', 'error');
        }
    } catch (err) {
        showNotification('Server error.', 'error');
    }
}

async function updateProduct() {
    if (!selectedProductId) {
        return showNotification('Please select a product to update.', 'warning');
    }

    const updatedData = collectDynamicFields();

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/products/${currentCategory}/${selectedProductId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData),
            credentials: 'include'
        });

        if (res.ok) {
            showNotification('Product updated!', 'success');
            loadCategoryData(currentCategory);
        } else {
            showNotification('Update failed.', 'error');
        }
    } catch (err) {
        showNotification('Update failed.', 'error');
    }
}

async function deleteProduct() {
    if (!selectedProductId) {
        return showNotification('Please select a product to delete.', 'warning');
    }

    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/products/${currentCategory}/${selectedProductId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (res.ok) {
            showNotification('Product deleted.', 'success');
            loadCategoryData(currentCategory);
        } else {
            showNotification('Delete failed.', 'error');
        }
    } catch (err) {
        showNotification('Delete failed.', 'error');
    }
}

function collectDynamicFields() {
    const inputs = document.querySelectorAll('[data-field-key]');
    const payload = {};

    inputs.forEach((input) => {
        const key = input.dataset.fieldKey;
        const type = input.dataset.fieldType;

        if (type === 'checkbox') {
            payload[key] = input.checked;
            return;
        }

        if (type === 'number') {
            payload[key] = input.value === '' ? '' : Number(input.value);
            return;
        }

        payload[key] = input.value;
    });

    return payload;
}

function createEmptyProduct() {
    return currentSchema.reduce((acc, field) => {
        acc[field.key] = field.type === 'checkbox' ? false : '';
        return acc;
    }, {});
}

function syncImagePreview(imagePath) {
    const preview = document.getElementById('imagePreview');
    if (!preview) {
        return;
    }

    if (imagePath) {
        const fullPath = imagePath.startsWith('http') ? imagePath : `${API_BASE_URL}/${imagePath}`;
        preview.innerHTML = `<img src="${fullPath}" alt="Preview">`;
        return;
    }

    preview.innerHTML = `
        <span class="image-placeholder">
            <i class="bi bi-image"></i>
            <span>No image selected</span>
        </span>
    `;
}

function shouldSpanFullWidth(key) {
    return ['imgpath', 'specs', 'features', 'description'].includes(key.toLowerCase());
}

function isTextareaField(key) {
    return ['specs', 'features', 'description'].includes(key.toLowerCase());
}

function formatFieldLabel(key) {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (char) => char.toUpperCase())
        .trim();
}

function getProductName(product) {
    return product.cpuname || product.gpuname || product.ramname || product.storagename || product.brand || product.Brand || 'Unnamed Product';
}

function getProductMeta(product) {
    const price = product.price ? `$${product.price}` : 'No price set';
    const rating = product.rating ? `Rating ${product.rating}` : 'No rating';
    return `${rating} - ${price}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
