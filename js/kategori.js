// ===================================
//  KATEGORI.JS — API Connected
// ===================================

const ICONS = [
  "&#127828;","&#129382;","&#129380;","&#127871;","&#128684;",
  "&#128295;","&#129529;","&#127981;","&#128247;","&#127757;",
  "&#128214;","&#128167;","&#127974;","&#129473;","&#128138;"
];

const COLORS = [
  "#f97316","#3b82f6","#eab308","#6b7280","#8b5cf6",
  "#22c55e","#ef4444","#06b6d4","#ec4899","#84cc16"
];

let dataKategori  = [];
let selectedIcon  = ICONS[0];
let selectedColor = COLORS[0];
let hapusId       = null;


// ===== LOAD DARI API =====
function loadKategori() {
  const grid = document.getElementById("grid-kategori");
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#8987;</div><p>Memuat data...</p></div>';

  apiPost("getKategori")
    .then(function(res) {
      if (res.status === "success") {
        dataKategori = res.data || [];
        renderKategori();
      } else {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>' + (res.message || "Gagal memuat") + '</p></div>';
      }
    })
    .catch(function() {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>Koneksi gagal</p></div>';
    });
}


// ===== RENDER =====
function renderKategori() {
  const grid = document.getElementById("grid-kategori");
  grid.innerHTML = "";

  const MAX_KAT = 25;
  document.getElementById("totalKategori").innerText = dataKategori.length;
  document.getElementById("totalProduk").innerText =
    dataKategori.reduce(function(s, k) { return s + (k.jumlah || 0); }, 0);

  updateSectionBadge("kat-limit-badge", dataKategori.length, MAX_KAT, 20);
  const fab = document.getElementById("fab-tambah-kat");
  if (fab) {
    fab.disabled = dataKategori.length >= MAX_KAT;
    fab.title    = dataKategori.length >= MAX_KAT ? "Batas maksimal 25 kategori tercapai" : "Tambah Kategori";
  }

  if (dataKategori.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127991;</div><p>Belum ada kategori.<br>Tambah kategori pertama kamu!</p></div>';
    return;
  }

  dataKategori.forEach(function(k) {
    const card = document.createElement("div");
    card.className = "kat-card";
    const bg = (k.warna || "#334155") + "22";

    card.innerHTML =
      '<div class="kat-card-icon-wrap" style="background:' + bg + '">' + (k.icon || "&#127991;") + '</div>' +
      '<div class="kat-card-name">' + k.nama + '</div>' +
      '<div class="kat-card-count">' + (k.jumlah || 0) + ' produk</div>' +
      '<div class="kat-card-actions">' +
        '<button class="kat-btn-edit"  onclick="editKategori(\'' + k.id + '\')">&#9998; Edit</button>' +
        '<button class="kat-btn-hapus" onclick="konfirmHapus(\'' + k.id + '\')">&#128465;</button>' +
      '</div>';

    grid.appendChild(card);
  });
}


// ===== ICON & COLOR PICKER =====
function renderPicker() {
  const ip = document.getElementById("icon-picker");
  const cp = document.getElementById("color-picker");
  ip.innerHTML = "";
  cp.innerHTML = "";

  ICONS.forEach(function(ic) {
    const el = document.createElement("div");
    el.className = "icon-option" + (ic === selectedIcon ? " selected" : "");
    el.innerHTML = ic;
    el.onclick = function() {
      selectedIcon = ic;
      document.getElementById("kat-icon").value = ic;
      renderPicker();
      updatePreview();
    };
    ip.appendChild(el);
  });

  COLORS.forEach(function(cl) {
    const el = document.createElement("div");
    el.className = "color-option" + (cl === selectedColor ? " selected" : "");
    el.style.background = cl;
    el.onclick = function() {
      selectedColor = cl;
      document.getElementById("kat-warna").value = cl;
      renderPicker();
      updatePreview();
    };
    cp.appendChild(el);
  });
}

function updatePreview() {
  const nama  = document.getElementById("kat-nama").value || "Nama Kategori";
  const warna = selectedColor;
  const bg    = warna + "33";

  document.getElementById("prev-icon").innerHTML   = selectedIcon;
  document.getElementById("prev-icon").style.background = bg;
  document.getElementById("prev-nama").innerText   = nama;
}


// ===== SIMPAN (TAMBAH / EDIT) =====
function simpanKategori() {
  const nama   = document.getElementById("kat-nama").value.trim();
  const editId = document.getElementById("kat-edit-id").value;

  if (!nama) { showToast("Nama kategori wajib diisi", "warning"); return; }

  const btn = document.getElementById("btn-simpan-kat");
  btn.disabled  = true;
  btn.innerText = "Menyimpan...";

  const action  = editId ? "updateKategori" : "addKategori";
  const payload = { nama: nama, icon: selectedIcon, warna: selectedColor };
  if (editId) payload.id = editId;

  apiPost(action, payload)
    .then(function(res) {
      if (res.status === "success") {
        closeModal("modal-tambah-kat");
        resetForm();
        loadKategori();
      } else {
        showToast(res.message || "Gagal menyimpan", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() {
      btn.disabled  = false;
      btn.innerText = editId ? "Simpan Perubahan" : "Simpan Kategori";
    });
}


// ===== EDIT =====
function editKategori(id) {
  const k = dataKategori.find(function(x) { return String(x.id) === String(id); });
  if (!k) return;

  selectedIcon  = k.icon  || ICONS[0];
  selectedColor = k.warna || COLORS[0];

  document.getElementById("kat-nama").value    = k.nama;
  document.getElementById("kat-icon").value    = k.icon  || "";
  document.getElementById("kat-warna").value   = k.warna || "";
  document.getElementById("kat-edit-id").value = k.id;
  document.getElementById("modal-kat-title").innerHTML = "&#9998; Edit Kategori";
  document.getElementById("btn-simpan-kat").innerText  = "Simpan Perubahan";

  renderPicker();
  updatePreview();
  openModal("modal-tambah-kat");
}


// ===== HAPUS =====
function konfirmHapus(id) {
  hapusId = id;
  openModal("modal-hapus-kat");
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("btn-konfirm-hapus").onclick = function() {
    if (!hapusId) return;

    const btn = document.getElementById("btn-konfirm-hapus");
    btn.disabled  = true;
    btn.innerText = "Menghapus...";

    apiPost("deleteKategori", { id: hapusId })
      .then(function(res) {
        hapusId = null;
        closeModal("modal-hapus-kat");
        if (res.status === "success") {
          loadKategori();
        } else {
          showToast(res.message || "Gagal menghapus", "error");
        }
      })
      .catch(function() { showToast("Koneksi gagal", "error"); })
      .finally(function() {
        btn.disabled  = false;
        btn.innerText = "Ya, Hapus";
      });
  };
});


// ===== RESET FORM =====
function resetForm() {
  selectedIcon  = ICONS[0];
  selectedColor = COLORS[0];
  document.getElementById("kat-nama").value    = "";
  document.getElementById("kat-edit-id").value = "";
  document.getElementById("modal-kat-title").innerHTML = "&#127991; Tambah Kategori";
  document.getElementById("btn-simpan-kat").innerText  = "Simpan Kategori";
  renderPicker();
  updatePreview();
}

// Saat FAB diklik → reset form dulu
const origOpen = window.openModal;
window.openModal = function(id) {
  if (id === "modal-tambah-kat") resetForm();
  origOpen(id);
};


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  const inputNama = document.getElementById("kat-nama");
  if (inputNama) inputNama.addEventListener("input", updatePreview);

  renderPicker();
  loadKategori();
});
