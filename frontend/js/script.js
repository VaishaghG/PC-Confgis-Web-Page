async function loadProducts(api, containerId) {
const container = document.getElementById(containerId);

if (!container) {
return;
}

try {
const response = await fetch(`http://localhost:5000/${api}`);

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

<button class="btn btn-dark btn-sm">
View
</button>

</div>

</div>

</div>

`;

});
} catch (error) {
console.error(error);
container.innerHTML = '<p class="text-muted">Unable to load products right now.</p>';
}

}


document.querySelectorAll('.nav-link[href^="#"]').forEach((link) => {
link.addEventListener("click", (event) => {
const targetId = link.getAttribute("href");
const targetSection = document.querySelector(targetId);

if (!targetSection) {
return;
}

event.preventDefault();
targetSection.scrollIntoView({
behavior: "smooth",
block: "start"
});
});
});


/* LOAD PRODUCTS */

loadProducts("cpus","cpuProducts");
loadProducts("gpus","gpuProducts");
loadProducts("rams","ramProducts");
loadProducts("storages","storageProducts");
loadProducts("cabinets","cabinetProducts");
