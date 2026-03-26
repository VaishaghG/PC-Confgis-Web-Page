var API_BASE_URL = "http://127.0.0.1:5000";
// Dynamically resolves to wherever the frontend is being served from
// Works on Live Server (5500), Express (5000), or any other port
var FRONTEND_BASE_URL = window.location.origin + "/frontend";
console.log("config.js loaded, API_BASE_URL:", API_BASE_URL, "FRONTEND_BASE_URL:", FRONTEND_BASE_URL);
