// API_BASE_URL is globally defined in config.js
const COMPONENT_KEYS = ['cpu', 'gpu', 'ram', 'storage', 'cabinet'];

function createEmptyBuildState() {
    return COMPONENT_KEYS.reduce((state, key) => {
        state[key] = null;
        return state;
    }, {});
}

let selectedBuild = createEmptyBuildState();

function getSelectedComponentCount() {
    return COMPONENT_KEYS.filter(type => Boolean(selectedBuild[type])).length;
}

async function loadProducts(api, containerId) {
const container = document.getElementById(containerId);

if (!container) {
return;
}

// Derive the product type from the api route name (e.g. "cpus" → "cpu")
const typeMap = { cpus:'cpu', gpus:'gpu', rams:'ram', storages:'storage', cabinets:'cabinet' };
const productType = typeMap[api] || api;

try {
const response = await fetch(`${API_BASE_URL}/${api}`);

if (!response.ok) {
throw new Error(`Failed to load ${api}: ${response.status}`);
}

const products = await response.json();

products.forEach(product => {

const name =
product.cpuname ||
product.gpuname ||
product.ramname ||
product.storagename ||
product.brand ||
product.Brand ||
"Product";

const image =
product.imgpath && product.imgpath !== ""
? product.imgpath
: "https://via.placeholder.com/300x200?text=No+Image";


container.innerHTML += `

<div class="product-item">

<div class="card product-card">

<img src="${image}" class="card-img-top">

<div class="card-body text-center">

<h6>${name}</h6>

<p class="product-price">$${product.price || "N/A"}</p>

<a href="product.html?id=${product._id}&type=${productType}" class="btn btn-dark btn-sm">
View
</a>
<button class="btn btn-outline-light btn-sm btn-select ms-2" onclick="selectComponent('${productType}', '${name}', '${product._id}', this)">
Select
</button>

</div>

</div>

</div>

`;

    });
    
    // Mark items that are already selected in our state
    if (selectedBuild[productType]) {
        markSelectedInDOM(productType, selectedBuild[productType]);
    } else {
        // Ensure buttons in this category are reset to default state
        container.querySelectorAll('.btn-select').forEach(b => {
            b.classList.remove('btn-success', 'selected');
            b.classList.add('btn-outline-light');
            b.innerText = 'Select';
        });
    }
} catch (error) {
console.error(error);
container.innerHTML = '<p class="text-muted">Unable to load products right now.</p>';
}

}

// Selection Persistence Logic
async function selectComponent(type, name, id, btn) {
    try {
        const authRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        const authData = await authRes.json();

        if (!authData.loggedIn) {
            window.location.href = `login.html?redirect=/frontend/index.html&error=unauth`;
            return;
        }

        const isSelected = btn.classList.contains('btn-success');

        if (isSelected) {
            // Toggle OFF: Unselect
            btn.classList.remove('btn-success', 'selected');
            btn.classList.add('btn-outline-light');
            btn.innerText = 'Select';
            selectedBuild[type] = null;
        } else {
            // Toggle ON: Select (and deselect others in same category)
            const container = btn.closest('.product-scroll');
            if (container) {
                container.querySelectorAll('.btn-select').forEach(b => {
                    b.classList.remove('btn-success', 'selected');
                    b.classList.add('btn-outline-light');
                    b.innerText = 'Select';
                });
            }

            // Select this one
            btn.classList.remove('btn-outline-light');
            btn.classList.add('btn-success', 'selected');
            btn.innerText = 'Selected';
            selectedBuild[type] = name;
        }

        localStorage.setItem('selectedBuild', JSON.stringify(selectedBuild));
        updateSaveButton();

        // 3. Persist to backend if logged in
        fetch(`${API_BASE_URL}/api/builds/update-current`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, name: selectedBuild[type] }),
            credentials: 'include'
        }).catch(err => console.error("Failed to persist build state", err));

    } catch (err) {
        console.error("Selection auth check failed", err);
    }
}

// Update UI for items as they load
function markSelectedInDOM(type, name) {
    const buttons = document.querySelectorAll(`[onclick*="selectComponent('${type}', '${name}'"]`);
    buttons.forEach(btn => {
        btn.classList.remove('btn-outline-light');
        btn.classList.add('btn-success', 'selected');
        btn.innerText = 'Selected';
    });
}

function clearSelectionButtons() {
    document.querySelectorAll('.btn-select').forEach(btn => {
        btn.classList.remove('btn-success', 'selected');
        btn.classList.add('btn-outline-light');
        btn.innerText = 'Select';
    });
}

// Load selections from localStorage and Database
async function loadStoredSelections() {
    const stored = localStorage.getItem('selectedBuild');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            Object.assign(selectedBuild, parsed);
        } catch (err) {
            console.error('Error parsing stored build from localStorage:', err);
        }
    }

    try {
        const authRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        const authData = await authRes.json();

        if (authData.loggedIn) {
            const buildRes = await fetch(`${API_BASE_URL}/api/builds/current`, { credentials: 'include' });
            const dbBuild = await buildRes.json();
            const hasActiveComponents = COMPONENT_KEYS.some(key => Boolean(dbBuild[key]));

            if (hasActiveComponents) {
                COMPONENT_KEYS.forEach(key => {
                    selectedBuild[key] = dbBuild[key] || null;
                });
            } else {
                resetBuildSelection();
                return;
            }
        }
    } catch (err) {
        console.error('Error syncing build from database:', err);
    }

    clearSelectionButtons();
    COMPONENT_KEYS.forEach(type => {
        if (selectedBuild[type]) markSelectedInDOM(type, selectedBuild[type]);
    });
    updateSaveButton();
}

// Update Save Button Visibility and Text
function updateSaveButton() {
    const container = document.getElementById('save-build-container');
    const btn = document.getElementById('btn-save-build');
    if (!container || !btn) return;

    const selectedCount = getSelectedComponentCount();
    const label = `<i class="bi bi-save2 me-2"></i>Save My Build (${selectedCount}/5)`;

    btn.innerHTML = label;
    btn.classList.remove('btn-success');
    btn.classList.add('btn-primary');

    if (selectedCount > 0) {
        container.classList.remove('d-none');
    } else {
        container.classList.add('d-none');
    }
}

// Validation Logic for Saving Build
document.getElementById('btn-save-build')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-build');
    // Check for all 5 components
    const selectedCount = getSelectedComponentCount();
    const remaining = COMPONENT_KEYS.length - selectedCount;

    if (remaining > 0) {
        showNotification(`Your build is incomplete! \n\nPlease add the remaining ${remaining} components to save your build.`, 'warning');
        return;
    }

    try {
        // Check Auth
        const authRes = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
        const authData = await authRes.json();

        if (!authData.loggedIn) {
            window.location.href = `login.html?redirect=/frontend/index.html&error=unauth`;
            return;
        }

        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;
        btn.disabled = true;

        const res = await fetch(`${API_BASE_URL}/api/builds/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(selectedBuild)
        });

        if (res.ok) {
            btn.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i>Saved!`;
            btn.classList.replace('btn-primary', 'btn-success');
            setTimeout(() => {
                showNotification("Build saved successfully!", 'success', {
                    actionLabel: "Go to Builds",
                    actionUrl: "dashboard.html#builds"
                });
                
                // CRITICAL: Reset the build state
                resetBuildSelection();

                setTimeout(() => {
                    btn.disabled = false;
                    updateSaveButton();
                }, 2000);
            }, 1000);
        } else {
            showNotification("Failed to save build.", 'error');
            btn.disabled = false;
            updateSaveButton();
        }
    } catch (err) {
        console.error(err);
        showNotification("Network error. Please try again.", 'error');
        btn.disabled = false;
        updateSaveButton();
    }
});


// Full reset of the build selection state
function resetBuildSelection() {
    selectedBuild = createEmptyBuildState();

    localStorage.removeItem('selectedBuild');
    localStorage.removeItem('currentBuild');
    sessionStorage.removeItem('selectedBuild');
    sessionStorage.removeItem('currentBuild');

    clearSelectionButtons();
    updateSaveButton();

    console.log("Build selection reset triggered.");
}

let activeScrollAnimation = null;
const sectionLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));

function easeInOutCubic(progress) {
return progress < 0.5
? 4 * progress * progress * progress
: 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function getNavbarOffset() {
const navbar = document.querySelector(".navbar");
return navbar ? navbar.offsetHeight + 18 : 120;
}

function animateScrollTo(targetY, duration) {
if (activeScrollAnimation !== null) {
window.cancelAnimationFrame(activeScrollAnimation);
activeScrollAnimation = null;
}

const startY = window.scrollY;
const distance = targetY - startY;
const startTime = performance.now();

function step(currentTime) {
const elapsed = currentTime - startTime;
const progress = Math.min(elapsed / duration, 1);
const easedProgress = easeInOutCubic(progress);

window.scrollTo(0, startY + distance * easedProgress);

if (progress < 1) {
activeScrollAnimation = window.requestAnimationFrame(step);
return;
}

activeScrollAnimation = null;
}

activeScrollAnimation = window.requestAnimationFrame(step);
}

function setActiveNavLink(sectionId) {
sectionLinks.forEach((link) => {
const isActive = link.getAttribute("href") === "#" + sectionId;
link.classList.toggle("is-active", isActive);
});
}

function updateActiveSection() {
const offset = getNavbarOffset() + 24;
let currentSectionId = "";

sectionLinks.forEach((link) => {
const targetId = link.getAttribute("href");

if (!targetId || targetId === "#") {
return;
}

const section = document.querySelector(targetId);

if (!section) {
return;
}

const sectionTop = section.getBoundingClientRect().top;

if (sectionTop - offset <= 0) {
currentSectionId = section.id;
}
});

setActiveNavLink(currentSectionId);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
link.addEventListener("click", (event) => {
const targetId = link.getAttribute("href");

if (!targetId) {
return;
}

if (targetId === "#") {
event.preventDefault();
animateScrollTo(0, 850);
window.history.replaceState(null, "", window.location.pathname + window.location.search);
return;
}

const targetSection = document.querySelector(targetId);

if (!targetSection) {
return;
}

event.preventDefault();

const targetY = Math.max(
0,
window.scrollY + targetSection.getBoundingClientRect().top - getNavbarOffset()
);

setActiveNavLink(targetSection.id);
animateScrollTo(targetY, 850);
window.history.replaceState(null, "", targetId);
});
});

window.addEventListener("scroll", updateActiveSection, { passive: true });
window.addEventListener("load", updateActiveSection);
updateActiveSection();


/* APP INITIALIZATION */
async function initApp() {
    // 1. Load stored selections first (localStorage + DB)
    await loadStoredSelections();

    // 2. Load products (they will use the populated selectedBuild state)
    await Promise.all([
        loadProducts("cpus", "cpuProducts"),
        loadProducts("gpus", "gpuProducts"),
        loadProducts("rams", "ramProducts"),
        loadProducts("storages", "storageProducts"),
        loadProducts("cabinets", "cabinetProducts")
    ]);
    
    // 3. Final UI check
    updateSaveButton();
}

// Start the app
initApp();


/* HERO CANVAS SCROLL ANIMATION */

const canvas = document.getElementById("hero-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const loadingOverlay = document.getElementById("hero-loading-overlay");
const scrollSection = document.getElementById("hero-scroll-section");
const textOverlays = document.querySelectorAll(".hero-text-overlay");

const frameCount = 196;
const images = [];
let imagesLoaded = 0;
let currentFrame = 0;

function padFrameNumber(num) {
return num.toString().padStart(3, '0');
}

function preloadImages() {
if (!canvas || !scrollSection) return;

for (let i = 1; i <= frameCount; i++) {
const img = new Image();
const frameNumber = padFrameNumber(i);
img.src = `images/PC Anim/ezgif-frame-${frameNumber}.webp`;

img.onload = () => {
imagesLoaded++;
if (imagesLoaded === frameCount) {
initCanvasAnimation();
}
};

img.onerror = () => {
console.warn(`Failed to open image ${frameNumber}`);
imagesLoaded++;
if (imagesLoaded === frameCount) {
initCanvasAnimation();
}
};

images.push(img);
}
}

function resizeCanvas() {
if (!canvas) return;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
drawFrame(currentFrame);
}

function drawFrame(index) {
if (!ctx || !images[index] || !images[index].complete || images[index].naturalWidth === 0) return;

const img = images[index];

const canvasRatio = canvas.width / canvas.height;
const imgRatio = img.width / img.height;

let drawWidth, drawHeight, offsetX, offsetY;

if (canvasRatio > imgRatio) {
// Canvas is wider than image (fit height)
drawHeight = canvas.height;
drawWidth = img.width * (drawHeight / img.height);
offsetX = (canvas.width - drawWidth) / 2;
offsetY = 0;
} else {
// Canvas is taller than image (fit width)
drawWidth = canvas.width;
drawHeight = img.height * (drawWidth / img.width);
offsetX = 0;
offsetY = (canvas.height - drawHeight) / 2;
}

ctx.clearRect(0, 0, canvas.width, canvas.height);
ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

function updateTextOverlays(progress) {
textOverlays.forEach((overlay, index) => {
let startFadeIn, endFadeIn, startFadeOut, endFadeOut;

if (index === 0) { // Section 1
startFadeIn = 0; endFadeIn = 0;
startFadeOut = 0.15; endFadeOut = 0.25;
} else if (index === 1) { // Section 2
startFadeIn = 0.25; endFadeIn = 0.35;
startFadeOut = 0.45; endFadeOut = 0.55;
} else if (index === 2) { // Section 3
startFadeIn = 0.55; endFadeIn = 0.65;
startFadeOut = 0.75; endFadeOut = 0.85;
} else { // Section 4
startFadeIn = 0.85; endFadeIn = 0.92;
startFadeOut = 1.1; endFadeOut = 1.2;
}

let opacity = 0;
let translate = 30; // Start 30px down

if (progress >= startFadeIn && progress <= endFadeOut) {
if (progress < endFadeIn) {
const phaseProgress = (progress - startFadeIn) / (endFadeIn - startFadeIn);
opacity = phaseProgress;
translate = 30 * (1 - phaseProgress);
} else if (progress > startFadeOut) {
const phaseProgress = (progress - startFadeOut) / (endFadeOut - startFadeOut);
opacity = 1 - phaseProgress;
translate = -30 * phaseProgress;
} else {
opacity = 1;
translate = 0;
}
}

overlay.style.opacity = Math.max(0, Math.min(1, opacity));
overlay.style.transform = `translateY(${translate}px)`;

if (opacity > 0) {
overlay.style.pointerEvents = "auto";
} else {
overlay.style.pointerEvents = "none";
}
});
}

function handleScroll() {
if (!scrollSection) return;

const sectionTop = scrollSection.offsetTop;
const sectionHeight = scrollSection.offsetHeight;
const viewportHeight = window.innerHeight;
const scrollY = window.scrollY;

// How far the user has scrolled into the section
const scrolled = scrollY - sectionTop;
const maxScroll = sectionHeight - viewportHeight;

let progress = 0;
if (scrolled > 0 && maxScroll > 0) {
progress = Math.min(Math.max(scrolled / maxScroll, 0), 1);
}

const frameIndex = Math.min(
frameCount - 1,
Math.floor(progress * frameCount)
);

if (frameIndex !== currentFrame) {
currentFrame = frameIndex;
requestAnimationFrame(() => drawFrame(currentFrame));
}

requestAnimationFrame(() => updateTextOverlays(progress));
}

function initCanvasAnimation() {
if (loadingOverlay) {
loadingOverlay.classList.add("fade-out");
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

requestAnimationFrame(() => drawFrame(0));
requestAnimationFrame(() => updateTextOverlays(0));

window.addEventListener("scroll", handleScroll, { passive: true });
handleScroll();
}

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', preloadImages);
} else {
preloadImages();
}
// Handle back-button navigation and bfcache
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        // Page restored from cache (back button)
        loadStoredSelections();
    }
});
