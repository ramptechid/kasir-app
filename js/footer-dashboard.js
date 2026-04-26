
// YEAR AUTO
document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.innerText = new Date().getFullYear();
});

// NAVIGATION
function goDashboard() {
  window.location.href = "dashboard.html";
}

function goKategori() {
  window.location.href = "kategori.html";
}

function goKatalog() {
  window.location.href = "katalog.html";
}

function goStok() {
  window.location.href = "stok.html";
}

function goKasir() {
  window.location.href = "kasir.html";
}

function goProduk() {
  window.location.href = "produk.html";
}