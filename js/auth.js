// ===== CEK LOGIN =====
if (localStorage.getItem("is_login") !== "true") {
  window.location.href = "login";
}

// ===== ROUTE GUARD BERDASARKAN ROLE =====
(function() {
  const role    = localStorage.getItem("role");
  const path    = window.location.pathname.toLowerCase();

  // Halaman yang hanya boleh diakses owner (match dengan atau tanpa .html)
  const ownerOnly = ["dashboard", "katalog", "kategori"];
  const isOwnerPage = ownerOnly.some(function(p) { return path.includes(p); });

  if (role !== "owner" && isOwnerPage) {
    window.location.href = "kasir";
  }
})();

// ===== LOGOUT =====
function logout() {
  localStorage.clear();
  window.location.href = "login";
}
