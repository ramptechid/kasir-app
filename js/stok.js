// ===================================
//  STOK.JS — Cabang-aware + role-limited
// ===================================

let dataStok      = [];
let dataFiltered  = [];
let stokType      = "tambah";
let activeCabangId = "";


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  // Sembunyikan tombol owner-only untuk staff
  if (!isOwner()) {
    document.querySelectorAll(".owner-only").forEach(function(el) { el.style.display = "none"; });
  }

  initCabangBar(function(cabangId) {
    activeCabangId = cabangId;
    if (!cabangId) {
      document.getElementById("stok-list").innerHTML =
        '<div class="empty-state"><div class="empty-icon">&#127978;</div>' +
        '<p>Belum ada cabang.<br><a href="dashboard.html" style="color:#3b82f6;">Tambah cabang di Dashboard</a></p></div>';
      return;
    }
    loadStok();
  });
});


// ===== LOAD DARI API =====
function loadStok() {
  const list = document.getElementById("stok-list");
  list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#8987;</div><p>Memuat data...</p></div>';

  apiPost("getStok", { cabang_id: activeCabangId })
    .then(function(res) {
      if (res.status === "success") {
        dataStok = res.data || [];
        renderStats();
        filterStok();
      } else {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>' + (res.message || "Gagal memuat") + '</p></div>';
      }
    })
    .catch(function() {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>Koneksi gagal</p></div>';
    });
}


// ===== HELPER STATUS =====
function getStatus(stok) {
  if (stok === 0) return { label:"Habis",    cls:"badge-red"    };
  if (stok <= 5)  return { label:"Menipis",  cls:"badge-yellow" };
  return              { label:"Tersedia", cls:"badge-green"  };
}


// ===== RENDER STATS =====
function renderStats() {
  document.getElementById("st-tersedia").innerText = dataStok.filter(function(p) { return p.stok > 5; }).length;
  document.getElementById("st-menipis").innerText  = dataStok.filter(function(p) { return p.stok > 0 && p.stok <= 5; }).length;
  document.getElementById("st-habis").innerText    = dataStok.filter(function(p) { return p.stok === 0; }).length;
}


// ===== FILTER =====
function filterStok() {
  const q      = (document.getElementById("stok-search").value || "").toLowerCase();
  const status = document.getElementById("stok-filter").value;

  dataFiltered = dataStok.filter(function(p) {
    const matchQ = p.nama.toLowerCase().includes(q) || (p.barcode || "").includes(q);
    const st     = getStatus(p.stok).label.toLowerCase();
    const matchS = !status || st === status;
    return matchQ && matchS;
  });

  renderList();
}


// ===== RENDER LIST =====
function renderList() {
  const list = document.getElementById("stok-list");
  list.innerHTML = "";

  if (dataFiltered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128202;</div><p>Tidak ada produk ditemukan</p></div>';
    return;
  }

  dataFiltered.forEach(function(p) {
    const st        = getStatus(p.stok);
    const stokColor = p.stok === 0 ? "#ef4444" : p.stok <= 5 ? "#eab308" : "white";

    const item = document.createElement("div");
    item.className = "stok-item";

    // Owner melihat harga, staff tidak
    const hargaHtml = isOwner()
      ? '<span style="color:#22c55e;">' + formatRupiah(p.harga || 0) + '</span>'
      : "";

    item.innerHTML =
      '<div class="stok-item-icon">' + (p.icon || "&#128230;") + '</div>' +
      '<div class="stok-item-info">' +
        '<div class="stok-item-nama">' + p.nama + '</div>' +
        '<div class="stok-item-meta">' +
          '<span>' + (p.kategori || '-') + '</span>' +
          '<span>' + (p.barcode  || '-') + '</span>' +
          hargaHtml +
        '</div>' +
      '</div>' +
      '<div class="stok-item-right">' +
        '<span class="badge ' + st.cls + '">' + st.label + '</span>' +
        '<div class="stok-num-wrap">' +
          '<span class="stok-num" style="color:' + stokColor + '">' + p.stok + '</span>' +
          '<span class="stok-num-label">unit</span>' +
        '</div>' +
        '<button class="btn-atur-stok" onclick="bukaModalStok(\'' + p.id + '\')">&#9881; Atur</button>' +
      '</div>';

    list.appendChild(item);
  });
}


// ===== BUKA MODAL STOK =====
function bukaModalStok(id) {
  const p = dataStok.find(function(x) { return String(x.id) === String(id); });
  if (!p) return;

  document.getElementById("stok-edit-id").value = p.id;
  document.getElementById("stok-qty").value     = 1;
  document.getElementById("stok-catatan").value = "";

  const st = getStatus(p.stok);
  document.getElementById("stok-produk-info").innerHTML =
    '<strong>' + p.nama + '</strong>' +
    'Stok saat ini: <b>' + p.stok + ' unit</b> &nbsp;' +
    '<span class="badge ' + st.cls + '">' + st.label + '</span>';

  // Staff selalu mulai di mode tambah
  setStokType("tambah");
  updatePreviewStok(p);
  openModal("modal-stok");
}


// ===== TYPE (tambah / kurang / set) =====
function setStokType(type) {
  // Staff hanya boleh tambah
  if (!isOwner() && type !== "tambah") return;

  stokType = type;
  document.getElementById("stok-type").value = type;

  ["tambah","kurang","set"].forEach(function(t) {
    const btn = document.getElementById("btn-" + t);
    if (btn) btn.classList.toggle("active", t === type);
  });

  const id = document.getElementById("stok-edit-id").value;
  const p  = dataStok.find(function(x) { return String(x.id) === String(id); });
  if (p) updatePreviewStok(p);
}


// ===== QTY BUTTONS =====
function changeQty(delta) {
  const input = document.getElementById("stok-qty");
  input.value = Math.max(0, (parseInt(input.value) || 0) + delta);

  const id = document.getElementById("stok-edit-id").value;
  const p  = dataStok.find(function(x) { return String(x.id) === String(id); });
  if (p) updatePreviewStok(p);
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("stok-qty").addEventListener("input", function() {
    const id = document.getElementById("stok-edit-id").value;
    const p  = dataStok.find(function(x) { return String(x.id) === String(id); });
    if (p) updatePreviewStok(p);
  });
});


// ===== PREVIEW =====
function updatePreviewStok(p) {
  const qty   = parseInt(document.getElementById("stok-qty").value) || 0;
  let hasil   = p.stok;

  if (stokType === "tambah") hasil = p.stok + qty;
  if (stokType === "kurang") hasil = Math.max(0, p.stok - qty);
  if (stokType === "set")    hasil = qty;

  const arrow = stokType === "tambah" ? "&#8593;" : stokType === "kurang" ? "&#8595;" : "&#8594;";
  const color = hasil === 0 ? "#ef4444" : hasil <= 5 ? "#eab308" : "#22c55e";

  document.getElementById("stok-preview-row").innerHTML =
    'Perubahan: ' + p.stok + ' ' + arrow + ' <strong style="color:' + color + '">' + hasil + ' unit</strong>';
}


// ===== SIMPAN STOK =====
function simpanStok() {
  const id  = document.getElementById("stok-edit-id").value;
  const qty = parseInt(document.getElementById("stok-qty").value) || 0;

  const btn = document.querySelector("#modal-stok .btn-primary");
  btn.disabled = true; btn.innerText = "Menyimpan...";

  apiPost("updateStok", { product_id: id, cabang_id: activeCabangId, type: stokType, qty: qty })
    .then(function(res) {
      if (res.status === "success") {
        closeModal("modal-stok");
        loadStok();
      } else {
        showToast(res.message || "Gagal update stok", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() { btn.disabled = false; btn.innerText = "Simpan Perubahan"; });
}
