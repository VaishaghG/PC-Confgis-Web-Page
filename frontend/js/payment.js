/**
 * payment.js — Simulated Payment Flow
 * Handles UPI / Card validation, order summary rendering, and payment simulation.
 */

'use strict';

/* ── State ── */
let activeMethod = 'upi';

/* ── On DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {
    loadOrderSummary();
});

/* ─────────────────────────────────────────
   ORDER SUMMARY
───────────────────────────────────────── */
function loadOrderSummary() {
    const checkoutDataStr = localStorage.getItem('checkoutData');
    if (!checkoutDataStr) {
        window.location.href = 'cart.html';
        return;
    }
    
    const checkoutData = JSON.parse(checkoutDataStr);
    const total = checkoutData.totalAmount || 0;
    
    const numItems = (checkoutData.items || []).reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0);
    const numBuilds = (checkoutData.builds || []).length;
    const itemsCount = numItems + numBuilds;

    const itemText = itemsCount === 0
        ? 'Items from your checkout'
        : `${itemsCount} item${itemsCount !== 1 ? 's' : ''}`;

    document.getElementById('summary-item-count').textContent = itemText;
    document.getElementById('summary-subtotal').textContent = formatCurrency(total);
    document.getElementById('summary-total').textContent = formatCurrency(total);
}

function formatCurrency(amount) {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
}

/* ─────────────────────────────────────────
   TAB SWITCHING
───────────────────────────────────────── */
function switchTab(method) {
    activeMethod = method;

    // Update tab buttons
    document.querySelectorAll('.method-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
    });
    const activeTab = document.getElementById(`tab-${method}`);
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');

    // Update panels
    document.querySelectorAll('.method-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`panel-${method}`).classList.add('active');
}

/* ─────────────────────────────────────────
   UPI VALIDATION
───────────────────────────────────────── */
function validateUPI() {
    const input = document.getElementById('upi-id');
    const errorEl = document.getElementById('upi-error');
    const payBtn = document.getElementById('upi-pay-btn');
    const raw = input.value.trim();

    // Reset state
    input.classList.remove('error', 'success');
    errorEl.textContent = '';

    if (raw.length === 0) {
        payBtn.disabled = true;
        return;
    }

    if (!raw.includes('@')) {
        setFieldError(input, errorEl, 'UPI ID must contain "@" (e.g. name@upi)');
        payBtn.disabled = true;
        return;
    }

    const parts = raw.split('@');
    if (parts[0].length < 3) {
        setFieldError(input, errorEl, 'Username part must be at least 3 characters');
        payBtn.disabled = true;
        return;
    }

    if (parts[1].length < 2) {
        setFieldError(input, errorEl, 'Provider part too short (e.g. name@paytm)');
        payBtn.disabled = true;
        return;
    }

    setFieldSuccess(input);
    payBtn.disabled = false;
}

/* ─────────────────────────────────────────
   CARD FORMATTING HELPERS
───────────────────────────────────────── */
function formatCardNumber(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 16);
    input.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(input) {
    let val = input.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
        val = val.substring(0, 2) + '/' + val.substring(2);
    }
    input.value = val;
}

/* ─────────────────────────────────────────
   CARD VALIDATION
───────────────────────────────────────── */
function validateCard() {
    const numInput = document.getElementById('card-number');
    const nameInput = document.getElementById('card-name');
    const expiryInput = document.getElementById('card-expiry');
    const cvvInput = document.getElementById('card-cvv');
    const payBtn = document.getElementById('card-pay-btn');

    const numEl   = document.getElementById('card-number-error');
    const nameEl  = document.getElementById('card-name-error');
    const expEl   = document.getElementById('card-expiry-error');
    const cvvEl   = document.getElementById('card-cvv-error');

    // Reset
    [numInput, nameInput, expiryInput, cvvInput].forEach(el => {
        el.classList.remove('error', 'success');
    });
    [numEl, nameEl, expEl, cvvEl].forEach(el => { el.textContent = ''; });

    let valid = true;

    // Card number — exactly 16 digits
    const rawNum = numInput.value.replace(/\s/g, '');
    if (rawNum.length === 0) {
        valid = false;
    } else if (!/^\d{16}$/.test(rawNum)) {
        setFieldError(numInput, numEl, 'Card number must be 16 digits');
        valid = false;
    } else {
        setFieldSuccess(numInput);
    }

    // Cardholder name — not empty
    const name = nameInput.value.trim();
    if (name.length === 0) {
        valid = false;
    } else if (name.length < 3) {
        setFieldError(nameInput, nameEl, 'Enter the full name as shown on card');
        valid = false;
    } else {
        setFieldSuccess(nameInput);
    }

    // Expiry — MM/YY and not in the past
    const expiry = expiryInput.value.trim();
    if (expiry.length === 0) {
        valid = false;
    } else if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        setFieldError(expiryInput, expEl, 'Use MM/YY format');
        valid = false;
    } else {
        const [mm, yy] = expiry.split('/').map(Number);
        if (mm < 1 || mm > 12) {
            setFieldError(expiryInput, expEl, 'Invalid month (01–12)');
            valid = false;
        } else {
            const now = new Date();
            const expDate = new Date(2000 + yy, mm - 1);
            if (expDate < new Date(now.getFullYear(), now.getMonth())) {
                setFieldError(expiryInput, expEl, 'Card has expired');
                valid = false;
            } else {
                setFieldSuccess(expiryInput);
            }
        }
    }

    // CVV — exactly 3 digits
    const cvv = cvvInput.value.trim();
    if (cvv.length === 0) {
        valid = false;
    } else if (!/^\d{3}$/.test(cvv)) {
        setFieldError(cvvInput, cvvEl, 'CVV must be 3 digits');
        valid = false;
    } else {
        setFieldSuccess(cvvInput);
    }

    payBtn.disabled = !valid;
}

/* ─────────────────────────────────────────
   FIELD STATE HELPERS
───────────────────────────────────────── */
function setFieldError(inputEl, errorEl, msg) {
    inputEl.classList.remove('success');
    inputEl.classList.add('error');
    errorEl.textContent = msg;
}

function setFieldSuccess(inputEl) {
    inputEl.classList.remove('error');
    inputEl.classList.add('success');
}

/* ─────────────────────────────────────────
   PAYMENT HANDLER — SIMULATED
───────────────────────────────────────── */
async function handlePayment() {
    // Show full-screen loader
    showLoader();

    // Small delay to give the loader time to paint
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const checkoutDataStr = localStorage.getItem('checkoutData');
        if (!checkoutDataStr) {
            throw new Error("No checkout data found. Please return to cart.");
        }
        
        const checkoutData = JSON.parse(checkoutDataStr);
        const orderId = generateOrderId();
        checkoutData.orderId = orderId; // Append internal order ID

        // 2. Save exact order data snapshot without recalculating
        try {
            const orderRes = await fetch(`${API_BASE_URL}/api/orders/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(checkoutData)
            });

            if (!orderRes.ok) {
                const errData = await orderRes.json().catch(() => ({}));
                throw new Error(errData.message || "Server rejected order creation. Please check for incomplete builds.");
            }
        } catch (orderErr) {
            console.error('Order save error:', orderErr);
            // FATAL ERROR: Stop checkout, preserve cart, alert user
            hideLoader();
            alert(`Checkout Failed: ${orderErr.message}`);
            return;
        }

        // 3. Conditional cart cleanup
        const checkoutMode = localStorage.getItem('checkoutMode');
        if (checkoutMode === 'full-cart') {
            localStorage.removeItem('cart');
            clearBackendCart();
        }
        
        localStorage.removeItem('paymentTotal');
        localStorage.removeItem('paymentItemCount');
        localStorage.removeItem('currentBuild');
        localStorage.removeItem('checkoutData');
        localStorage.removeItem('checkoutMode');

        // 5. Wait for remaining animation, then redirect
        await new Promise(resolve => setTimeout(resolve, 1900));
        window.location.href = `success.html?orderId=${orderId}`;

    } catch (err) {
        console.error('Payment handler error:', err);
        hideLoader();
        // Re-enable pay buttons so user can retry
        document.querySelectorAll('.pay-btn').forEach(btn => { btn.disabled = false; });
        alert('Something went wrong. Please try again.');
    }
}

async function clearBackendCart() {
    try {
        // Best-effort: delete all items from the backend cart
        await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'DELETE',
            credentials: 'include'
        });
    } catch (_) {
        // Silent — this is best-effort; local state is already cleared
    }
}

function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'PCO-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/* ─────────────────────────────────────────
   LOADER
───────────────────────────────────────── */
function showLoader() {
    document.getElementById('loader-overlay').classList.add('active');
    // Disable pay buttons to prevent double-submits
    document.querySelectorAll('.pay-btn').forEach(btn => { btn.disabled = true; });
}

function hideLoader() {
    document.getElementById('loader-overlay').classList.remove('active');
}
