// ===================================
//  KATALOG.JS — API Connected
// ===================================

const KATALOG_ICONS = [
  "&#127828;","&#129380;","&#9749;","&#127871;","&#128684;","&#129529;",
  "&#127757;","&#127857;","&#129371;","&#127880;","&#127829;","&#127830;",
  "&#127831;","&#127832;","&#127833;","&#127834;","&#127835;","&#127836;",
  "&#128247;","&#128717;","&#128718;","&#128230;","&#128722;"
];

let dataKatalog    = [];
let katalogHapusId = null;
let dataKategoriOpts = [];   // daftar kategori dari API


// ===== LOAD KATEGORI OPTIONS =====
function loadKategoriOptions() {
  apiPost("getKategori")
    .then(function(res) {
      const sel = document.getElementById("k-kategori");
      sel.innerHTML = "";

      if (res.status === "success" && res.data && res.data.length > 0) {
        dataKategoriOpts = res.data;
        res.data.forEach(function(k) {
          const opt = document.createElement("option");
          opt.value       = k.nama;
          opt.textContent = k.nama;
          sel.appendChild(opt);
        });
      } else {
        // Fallback: tidak ada kategori
        const opt = document.createElement("option");
        opt.value       = "";
        opt.textContent = "Belum ada kategori";
        sel.appendChild(opt);
      }
    })
    .catch(function() {
      const sel = document.getElementById("k-kategori");
      sel.innerHTML = '<option value="">Gagal memuat kategori</option>';
    });
}


// ===== LOAD DARI API =====
function loadKatalog() {
  const list = document.getElementById("katalog-list");
  list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#8987;</div><p>Memuat data...</p></div>';

  apiPost("getProducts")
    .then(function(res) {
      if (res.status === "success") {
        dataKatalog = res.data || [];
        populateKategoriFilter();
        filterKatalog();
        updateSectionBadge("katalog-limit-badge", dataKatalog.length, 50, 40);
        var fab = document.getElementById("fab-tambah-katalog");
        if (fab) {
          fab.disabled = dataKatalog.length >= 50;
          fab.title    = dataKatalog.length >= 50 ? "Batas maksimal 50 produk tercapai" : "";
        }
      } else {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>' + (res.message || "Gagal memuat") + '</p></div>';
      }
    })
    .catch(function() {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon">&#10060;</div><p>Koneksi gagal</p></div>';
    });
}


// ===== FILTER KATEGORI DROPDOWN =====
function populateKategoriFilter() {
  const sel  = document.getElementById("katalog-filter-kat");
  const kats = [...new Set(dataKatalog.map(function(p) { return p.kategori; }).filter(Boolean))];

  // Kosongkan opsi selain "Semua"
  while (sel.options.length > 1) sel.remove(1);

  kats.forEach(function(k) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });
}


// ===== FILTER =====
function filterKatalog() {
  const q   = (document.getElementById("katalog-search").value || "").toLowerCase();
  const kat = document.getElementById("katalog-filter-kat").value;

  const filtered = dataKatalog.filter(function(p) {
    const matchQ   = p.nama.toLowerCase().includes(q) || (p.barcode || "").includes(q);
    const matchKat = !kat || p.kategori === kat;
    return matchQ && matchKat;
  });

  renderKatalog(filtered);
}


// ===== RENDER LIST =====
function renderKatalog(list) {
  const container = document.getElementById("katalog-list");
  container.innerHTML = "";

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128230;</div><p>Produk tidak ditemukan</p></div>';
    return;
  }

  list.forEach(function(p) {
    let iconHtml = "";
    if (p.foto) {
      iconHtml = '<img src="' + p.foto + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" onerror="this.parentElement.innerHTML=\'' + (p.icon || "&#128230;") + '\'">';
    } else {
      iconHtml = p.icon || "&#128230;";
    }

    const modalLabel = p.harga_modal > 0
      ? '<span style="font-size:11px;color:#64748B;">Modal: ' + formatRupiah(p.harga_modal) + '</span>'
      : '<span style="font-size:11px;color:#64748B;">Modal: —</span>';

    const item = document.createElement("div");
    item.className = "katalog-item";

    item.innerHTML =
      '<div class="katalog-item-icon">' + iconHtml + '</div>' +
      '<div class="katalog-item-info">' +
        '<div class="katalog-item-nama">' + p.nama + '</div>' +
        '<div class="katalog-item-meta">' +
          '<span class="katalog-item-kategori">' + (p.kategori || '-') + '</span>' +
          '<span class="katalog-item-barcode">' + (p.barcode || '-') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:10px;align-items:center;">' +
          '<div class="katalog-item-harga">' + formatRupiah(p.harga || 0) + '</div>' +
          modalLabel +
        '</div>' +
      '</div>' +
      '<div class="katalog-item-right">' +
        '<div class="katalog-item-actions">' +
          '<button class="btn-assign" onclick="openAssignCabang(\'' + p.id + '\')" title="Stok per Cabang">&#127978;</button>' +
          '<button class="btn-edit"   onclick="openEditKatalog(\'' + p.id + '\')" title="Edit">&#9998;</button>' +
          '<button class="btn-delete" onclick="konfirmHapusKatalog(\'' + p.id + '\')" title="Hapus">&#128465;</button>' +
        '</div>' +
      '</div>';

    container.appendChild(item);
  });
}


// ===== ICON PICKER =====
function renderIconPicker(selectedIcon) {
  const picker = document.getElementById("katalog-icon-picker");
  picker.innerHTML = "";

  KATALOG_ICONS.forEach(function(ic) {
    const btn = document.createElement("button");
    btn.className = "katalog-icon-btn" + (ic === selectedIcon ? " selected" : "");
    btn.innerHTML = ic;
    btn.type = "button";
    btn.onclick = function() {
      document.querySelectorAll(".katalog-icon-btn").forEach(function(b) { b.classList.remove("selected"); });
      btn.classList.add("selected");
      document.getElementById("k-icon").value = ic;
    };
    picker.appendChild(btn);
  });
}


// ===== BUKA MODAL TAMBAH =====
function openTambahKatalog() {
  if (dataKatalog.length >= 50) { showToast("Batas maksimal 50 produk telah tercapai!", "warning"); return; }
  document.getElementById("katalog-modal-title").innerText = "Tambah Produk";
  document.getElementById("k-edit-id").value   = "";
  document.getElementById("k-nama").value      = "";
  document.getElementById("k-barcode").value   = "";
  document.getElementById("k-harga").value       = "";
  document.getElementById("k-harga-modal").value = "";
  // Pilih opsi pertama yang tersedia sebagai default
  const sel = document.getElementById("k-kategori");
  if (sel.options.length > 0) sel.selectedIndex = 0;
  document.getElementById("k-icon").value      = "&#128230;";
  document.getElementById("k-btn-save").innerText = "Simpan Produk";

  renderIconPicker("&#128230;");
  openModal("modal-katalog");
}


// ===== BUKA MODAL EDIT =====
function openEditKatalog(id) {
  const p = dataKatalog.find(function(x) { return String(x.id) === String(id); });
  if (!p) return;

  document.getElementById("katalog-modal-title").innerText = "Edit Produk";
  document.getElementById("k-edit-id").value   = p.id;
  document.getElementById("k-nama").value      = p.nama;
  document.getElementById("k-barcode").value   = p.barcode || "";
  document.getElementById("k-harga").value       = p.harga;
  document.getElementById("k-harga-modal").value = p.harga_modal || "";
  document.getElementById("k-kategori").value    = p.kategori || "";
  document.getElementById("k-icon").value      = p.icon || "&#128230;";
  document.getElementById("k-btn-save").innerText = "Simpan Perubahan";

  renderIconPicker(p.icon || "&#128230;");
  openModal("modal-katalog");
}


// ===== SIMPAN (ADD / EDIT) =====
function simpanKatalog() {
  const nama       = document.getElementById("k-nama").value.trim();
  const barcode    = document.getElementById("k-barcode").value.trim();
  const harga      = parseInt(document.getElementById("k-harga").value) || 0;
  const haModal    = document.getElementById("k-harga-modal").value;
  const hargaModal = haModal !== "" ? (parseInt(haModal) || 0) : null;
  const kat        = document.getElementById("k-kategori").value;
  const icon       = document.getElementById("k-icon").value || "&#128230;";
  const editId     = document.getElementById("k-edit-id").value;

  if (!nama)     { showToast("Nama produk wajib diisi!", "warning"); return; }
  if (harga <= 0){ showToast("Harga jual harus lebih dari 0!", "warning"); return; }

  const btn = document.getElementById("k-btn-save");
  btn.disabled  = true;
  btn.innerText = "Menyimpan...";

  const action  = editId ? "updateProduct" : "addProduct";
  const payload = { nama, barcode, harga, kategori: kat, icon };
  if (hargaModal !== null) payload.harga_modal = hargaModal;
  if (editId) payload.id = editId;

  apiPost(action, payload)
    .then(function(res) {
      if (res.status === "success") {
        closeModal("modal-katalog");
        loadKatalog();
      } else {
        showToast(res.message || "Gagal menyimpan produk", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() {
      btn.disabled  = false;
      btn.innerText = editId ? "Simpan Perubahan" : "Simpan Produk";
    });
}


// ===== HAPUS =====
function konfirmHapusKatalog(id) {
  katalogHapusId = id;
  const p = dataKatalog.find(function(x) { return String(x.id) === String(id); });
  document.getElementById("hapus-katalog-nama").innerText = p
    ? '"' + p.nama + '" akan dihapus permanen.'
    : 'Produk ini akan dihapus permanen.';
  openModal("modal-hapus-katalog");
}

function eksekusiHapusKatalog() {
  if (!katalogHapusId) return;

  const btn = document.getElementById("btn-konfirm-hapus-katalog");
  btn.disabled  = true;
  btn.innerText = "Menghapus...";

  apiPost("deleteProduct", { id: katalogHapusId })
    .then(function(res) {
      katalogHapusId = null;
      closeModal("modal-hapus-katalog");
      if (res.status === "success") {
        loadKatalog();
      } else {
        showToast(res.message || "Gagal menghapus produk", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() {
      btn.disabled  = false;
      btn.innerText = "Ya, Hapus";
    });
}


// ===== ASSIGN PRODUK KE CABANG =====
var _assignOriginal = {};  // cabang_id -> true/false (status sebelum diubah)

function openAssignCabang(productId) {
  var p = dataKatalog.find(function(x) { return String(x.id) === String(productId); });
  document.getElementById("assign-produk-id").value      = productId;
  document.getElementById("assign-produk-nama").innerText = p ? p.nama : "";
  document.getElementById("assign-cabang-list").innerHTML =
    '<div class="assign-empty">Memuat cabang...</div>';
  openModal("modal-assign-cabang");

  apiPost("getStokProduk", { product_id: productId })
    .then(function(res) {
      if (res.status === "success") {
        renderAssignList(res.data);
      } else {
        document.getElementById("assign-cabang-list").innerHTML =
          '<div class="assign-empty">Gagal memuat data</div>';
      }
    })
    .catch(function() {
      document.getElementById("assign-cabang-list").innerHTML =
        '<div class="assign-empty">Koneksi gagal</div>';
    });
}

function renderAssignList(cabangData) {
  var wrap = document.getElementById("assign-cabang-list");
  _assignOriginal = {};

  if (!cabangData || cabangData.length === 0) {
    wrap.innerHTML = '<div class="assign-empty">Belum ada cabang &mdash; tambah dulu di Dashboard.</div>';
    return;
  }

  wrap.innerHTML = "";
  cabangData.forEach(function(c) {
    var isAssigned = c.qty !== null;          // qty !== null berarti ada entry di stok sheet
    _assignOriginal[c.cabang_id] = isAssigned;

    var row = document.createElement("div");
    row.className = "assign-cabang-row";

    var badgeCls  = isAssigned ? "assign-status-badge assigned" : "assign-status-badge";
    var badgeTxt  = isAssigned ? "Dijual di sini" : "Tidak dijual";

    row.innerHTML =
      '<label class="assign-toggle-label">' +
        '<input type="checkbox" class="assign-toggle" data-cabang-id="' + c.cabang_id + '"' +
          (isAssigned ? ' checked' : '') + '>' +
        '<span class="assign-cabang-nama">&#127978; ' + c.cabang_nama + '</span>' +
        '<span class="' + badgeCls + '">' + badgeTxt + '</span>' +
      '</label>';

    // Update badge realtime saat checkbox diubah
    var cb    = row.querySelector(".assign-toggle");
    var badge = row.querySelector(".assign-status-badge");
    cb.addEventListener("change", function() {
      badge.textContent = this.checked ? "Dijual di sini" : "Tidak dijual";
      badge.className   = this.checked ? "assign-status-badge assigned" : "assign-status-badge";
    });

    wrap.appendChild(row);
  });
}

function simpanAssign() {
  var productId  = document.getElementById("assign-produk-id").value;
  var checkboxes = document.querySelectorAll("#assign-cabang-list .assign-toggle");
  if (!productId || checkboxes.length === 0) return;

  var btn = document.getElementById("btn-simpan-assign");
  btn.disabled  = true;
  btn.innerText = "Menyimpan...";

  // Kumpulkan hanya perubahan yang terjadi
  var tasks = [];
  checkboxes.forEach(function(cb) {
    var cabangId    = cb.dataset.cabangId;
    var wasAssigned = !!_assignOriginal[cabangId];
    var nowAssigned = cb.checked;

    if (!wasAssigned && nowAssigned) {
      // Baru di-assign: buat entry stok dengan qty 0
      tasks.push((function(cid) {
        return function() {
          return apiPost("updateStok", { product_id: productId, cabang_id: cid, qty: 0, type: "set" });
        };
      })(cabangId));
    } else if (wasAssigned && !nowAssigned) {
      // Di-unassign: hapus entry stok
      tasks.push((function(cid) {
        return function() {
          return apiPost("updateStok", { product_id: productId, cabang_id: cid, qty: 0, type: "unassign" });
        };
      })(cabangId));
    }
    // Tidak berubah = skip
  });

  if (tasks.length === 0) {
    closeModal("modal-assign-cabang");
    btn.disabled  = false;
    btn.innerText = "Simpan";
    return;
  }

  tasks.reduce(function(chain, task) {
    return chain.then(task);
  }, Promise.resolve())
    .then(function() { closeModal("modal-assign-cabang"); })
    .catch(function() { showToast("Gagal menyimpan sebagian perubahan", "error"); })
    .finally(function() {
      btn.disabled  = false;
      btn.innerText = "Simpan";
    });
}


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  loadKategoriOptions();
  loadKatalog();
});
