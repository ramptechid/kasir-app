
// YEAR AUTO
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.innerText = new Date().getFullYear();
});

// NAVIGATION
function goDashboard() {
  window.location.href = "dashboard";
}

function goKategori() {
  window.location.href = "kategori";
}

function goKatalog() {
  window.location.href = "katalog";
}

function goStok() {
  window.location.href = "stok";
}

function goKasir() {
  window.location.href = "kasir";
}

function goProduk() {
  window.location.href = "produk";
}