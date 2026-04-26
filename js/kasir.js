// ===================================
//  KASIR.JS — Cabang-aware + API Connected
// ===================================

let PRODUK         = [];
let cart           = [];
let metodeBayar    = "tunai";
let nomorTransaksi = 1;
let activeCabangId = "";


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  initCabangBar(function(cabangId) {
    activeCabangId = cabangId;
    if (!cabangId) {
      document.getElementById("produk-grid").innerHTML =
        '<div class="empty-state"><div class="empty-icon">&#127978;</div>' +
        '<p>Belum ada cabang.<br><a href="dashboard" style="color:#3b82f6;">Tambah cabang di Dashboard</a></p></div>';
      return;
    }
    loadProdukKasir();
  });

  document.getElementById("s-diskon").addEventListener("input", renderCart);
  renderCart();
});


// ===== LOAD PRODUK DARI API =====
function loadProdukKasir() {
  const grid = document.getElementById("produk-grid");
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#8987;</div><p>Memuat produk...</p></div>';

  apiPost("getProducts", { cabang_id: activeCabangId })
    .then(function(res) {
      if (res.status === "success") {
        PRODUK = res.data || [];
        renderKatChips();
        filterProduk();
      } else {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>' + (res.message || "Gagal memuat") + '</p></div>';
      }
    })
    .catch(function() {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>Koneksi gagal</p></div>';
    });
}


// ===== KATEGORI CHIPS =====
function renderKatChips() {
  const row = document.getElementById("kat-filter-row");
  const kategoriList = ["Semua", ...new Set(PRODUK.map(function(p) { return p.kategori; }).filter(Boolean))];

  row.innerHTML = "";
  kategoriList.forEach(function(k) {
    const chip = document.createElement("button");
    chip.className = "kat-chip" + (k === "Semua" ? " active" : "");
    chip.innerText = k;
    chip.onclick = function() {
      document.querySelectorAll(".kat-chip").forEach(function(c) { c.classList.remove("active"); });
      chip.classList.add("active");
      filterProduk();
    };
    row.appendChild(chip);
  });
}


// ===== FILTER & RENDER PRODUK =====
function filterProduk() {
  const q   = (document.getElementById("kasir-search").value || "").toLowerCase();
  const kat = (document.querySelector(".kat-chip.active") || {}).innerText || "Semua";

  const filtered = PRODUK.filter(function(p) {
    const matchKat = kat === "Semua" || p.kategori === kat;
    const matchQ   = p.nama.toLowerCase().includes(q);
    return matchKat && matchQ;
  });

  renderProdukGrid(filtered);
}

function renderProdukGrid(list) {
  const grid = document.getElementById("produk-grid");
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128230;</div><p>Produk tidak ditemukan</p></div>';
    return;
  }

  list.forEach(function(p) {
    const stok = Number(p.stok) || 0;
    const card = document.createElement("div");
    card.className = "produk-card" + (stok === 0 ? " out-of-stock" : "");

    const iconHtml = p.foto
      ? '<img src="' + p.foto + '" style="width:36px;height:36px;object-fit:cover;border-radius:6px;" onerror="this.outerHTML=\'' + (p.icon || "&#128230;") + '\'">'
      : (p.icon || "&#128230;");

    card.innerHTML =
      '<div class="produk-card-icon">' + iconHtml + '</div>' +
      '<div class="produk-card-nama">' + p.nama + '</div>' +
      '<div class="produk-card-harga">' + formatRupiah(p.harga || 0) + '</div>' +
      '<div class="produk-card-stok">Stok: ' + stok + '</div>';

    if (stok > 0) {
      card.onclick = function() { tambahKeCart(p); };
    }

    grid.appendChild(card);
  });
}


// ===== CART =====
function tambahKeCart(p) {
  const stok = Number(p.stok) || 0;
  const idx  = cart.findIndex(function(c) { return c.produk.id === p.id; });

  if (idx !== -1) {
    if (cart[idx].qty >= stok) { showToast("Stok tidak cukup!", "warning"); return; }
    cart[idx].qty++;
  } else {
    cart.push({ produk: p, qty: 1 });
  }

  renderCart();
}

function ubahQty(produkId, delta) {
  const idx = cart.findIndex(function(c) { return String(c.produk.id) === String(produkId); });
  if (idx === -1) return;

  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  renderCart();
}

function clearCart() {
  if (cart.length === 0) return;
  showConfirm("Kosongkan semua item di keranjang?", function() {
    cart = [];
    renderCart();
  }, { danger: true, yesText: "Ya, Kosongkan", icon: "&#128722;" });
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const empty     = document.getElementById("cart-empty");

  const subtotal = cart.reduce(function(s, c) { return s + (c.produk.harga * c.qty); }, 0);
  const diskon   = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total    = Math.round(subtotal * (1 - diskon / 100));
  const jmlItem  = cart.reduce(function(s, c) { return s + c.qty; }, 0);

  document.getElementById("s-subtotal").innerText        = formatRupiah(subtotal);
  document.getElementById("s-total").innerText           = formatRupiah(total);
  document.getElementById("cart-total-mobile").innerText = formatRupiah(total);
  document.getElementById("cart-badge").innerText        = jmlItem;
  document.getElementById("btn-bayar").disabled          = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = "";
    container.appendChild(empty);
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";
  container.querySelectorAll(".cart-item").forEach(function(el) { el.remove(); });

  cart.forEach(function(c) {
    const item = document.createElement("div");
    item.className = "cart-item";

    item.innerHTML =
      '<div class="cart-item-icon">' + (c.produk.icon || "&#128230;") + '</div>' +
      '<div class="cart-item-info">' +
        '<div class="cart-item-nama">' + c.produk.nama + '</div>' +
        '<div class="cart-item-harga">' + formatRupiah(c.produk.harga) + ' / pcs</div>' +
      '</div>' +
      '<div class="cart-item-qty">' +
        '<button class="qty-btn minus" onclick="ubahQty(\'' + c.produk.id + '\', -1)">&#8722;</button>' +
        '<span class="qty-num">' + c.qty + '</span>' +
        '<button class="qty-btn" onclick="ubahQty(\'' + c.produk.id + '\', 1)">&#43;</button>' +
      '</div>' +
      '<div class="cart-item-subtotal">' + formatRupiah(c.produk.harga * c.qty) + '</div>';

    container.appendChild(item);
  });
}

// ===== MOBILE CART TOGGLE =====
function toggleCartMobile() {
  document.querySelector(".panel-keranjang").classList.toggle("mobile-open");
}

function closeCartMobile() {
  document.querySelector(".panel-keranjang").classList.remove("mobile-open");
}


// ===== BUKA BAYAR =====
function openBayar() {
  const subtotal = cart.reduce(function(s, c) { return s + c.produk.harga * c.qty; }, 0);
  const diskon   = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total    = Math.round(subtotal * (1 - diskon / 100));

  document.getElementById("bayar-total-num").innerText    = formatRupiah(total);
  document.getElementById("uang-diterima").value          = "";
  document.getElementById("kembalian-num").innerText      = "Rp 0";
  document.getElementById("btn-konfirm").disabled         = true;

  setMetode("tunai");
  openModal("modal-bayar");
}


// ===== METODE BAYAR =====
function setMetode(m) {
  metodeBayar = m;
  ["tunai","transfer","qris"].forEach(function(x) {
    document.getElementById("m-" + x).classList.toggle("active", x === m);
  });

  document.getElementById("section-tunai").style.display    = m === "tunai" ? "block" : "none";
  document.getElementById("section-nontunai").style.display = m !== "tunai" ? "block" : "none";
  document.getElementById("btn-konfirm").disabled           = m === "tunai";
}

function hitungKembalian() {
  const subtotal = cart.reduce(function(s, c) { return s + c.produk.harga * c.qty; }, 0);
  const diskon   = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total    = Math.round(subtotal * (1 - diskon / 100));
  const diterima = parseFloat(document.getElementById("uang-diterima").value) || 0;

  const kembalian = diterima - total;
  document.getElementById("kembalian-num").innerText = formatRupiah(Math.max(0, kembalian));
  document.getElementById("btn-konfirm").disabled    = diterima < total;
}

function setNominal(val) {
  document.getElementById("uang-diterima").value = val;
  hitungKembalian();
}

function setNominalPas() {
  const subtotal = cart.reduce(function(s, c) { return s + c.produk.harga * c.qty; }, 0);
  const diskon   = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total    = Math.round(subtotal * (1 - diskon / 100));
  document.getElementById("uang-diterima").value = total;
  hitungKembalian();
}


// ===== KONFIRM BAYAR =====
function konfirmBayar() {
  closeModal("modal-bayar");
  simpanTransaksiAPI();
  tampilkanStruk();
}

function simpanTransaksiAPI() {
  const subtotal    = cart.reduce(function(s, c) { return s + c.produk.harga * c.qty; }, 0);
  const diskon      = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total       = Math.round(subtotal * (1 - diskon / 100));
  const kasir       = localStorage.getItem("nama_bisnis") || "";

  const items = cart.map(function(c) {
    return {
      product_id: c.produk.id,
      nama:       c.produk.nama,
      harga:      c.produk.harga,
      qty:        c.qty
    };
  });

  apiPost("addTransaksi", {
    total:         total,
    diskon_persen: diskon,
    metode_bayar:  metodeBayar,
    kasir:         kasir,
    cabang_id:     activeCabangId,
    items:         items
  }).then(function(res) {
    if (res.status !== "success") {
      console.warn("Gagal simpan transaksi:", res.message);
    }
  }).catch(function(e) {
    console.warn("Error simpan transaksi:", e);
  });
}


// ===== TAMPILKAN STRUK =====
function tampilkanStruk() {
  const subtotal  = cart.reduce(function(s, c) { return s + c.produk.harga * c.qty; }, 0);
  const diskon    = parseFloat(document.getElementById("s-diskon").value) || 0;
  const total     = Math.round(subtotal * (1 - diskon / 100));
  const diterima  = parseFloat(document.getElementById("uang-diterima").value) || total;
  const kembalian = Math.max(0, diterima - total);

  const now   = new Date();
  const tgl   = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const jam   = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const noTrx = "TRX-" + String(nomorTransaksi).padStart(4, "0");

  document.getElementById("struk-toko").innerText    = localStorage.getItem("nama_bisnis") || "Warungin";
  document.getElementById("struk-tanggal").innerText = tgl + " " + jam;
  document.getElementById("struk-no").innerText      = noTrx;

  const strItems = document.getElementById("struk-items");
  strItems.innerHTML = "";
  cart.forEach(function(c) {
    const row = document.createElement("div");
    row.className = "struk-item-row";
    row.innerHTML =
      '<div class="struk-item-left">' + c.produk.nama +
        '<br><span style="color:#64748B;font-size:10px;">' + c.qty + ' x ' + formatRupiah(c.produk.harga) + '</span>' +
      '</div>' +
      '<div class="struk-item-right">' + formatRupiah(c.produk.harga * c.qty) + '</div>';
    strItems.appendChild(row);
  });

  document.getElementById("st-subtotal").innerText = formatRupiah(subtotal);

  const diskonRow = document.getElementById("st-diskon-row");
  if (diskon > 0) {
    diskonRow.style.display = "flex";
    document.getElementById("st-diskon").innerText = diskon + "% (-" + formatRupiah(subtotal - total) + ")";
  } else {
    diskonRow.style.display = "none";
  }

  document.getElementById("st-total").innerText  = formatRupiah(total);
  document.getElementById("st-metode").innerText = metodeBayar === "tunai" ? "Tunai" : metodeBayar === "transfer" ? "Transfer" : "QRIS";

  const kembalianRow = document.getElementById("st-kembalian-row");
  if (metodeBayar === "tunai") {
    kembalianRow.style.display = "flex";
    document.getElementById("st-kembalian").innerText = formatRupiah(kembalian);
  } else {
    kembalianRow.style.display = "none";
  }

  openModal("modal-struk");
}

function selesaiTransaksi() {
  nomorTransaksi++;
  cart = [];
  document.getElementById("s-diskon").value = "0";
  renderCart();
  closeModal("modal-struk");
  // Reload produk agar stok terupdate
  loadProdukKasir();
  if (window.innerWidth <= 768) {
    document.querySelector(".panel-keranjang").classList.remove("mobile-open");
  }
}


