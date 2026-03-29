var API_BASE_URL = window.location.origin;
var FRONTEND_BASE_URL = window.location.origin;
function formatUsdAsInr(amount) {
  var value = Number(amount || 0);
  if (!Number.isFinite(value)) return 'N/A';
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

console.log("config.js loaded, API_BASE_URL:", API_BASE_URL, "FRONTEND_BASE_URL:", FRONTEND_BASE_URL);
