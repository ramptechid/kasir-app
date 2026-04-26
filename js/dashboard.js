// ===================================
//  DASHBOARD.JS — Analytics + Management
// ===================================

let dataCabang   = [];
let dataStaf     = [];
let aktivePeriode = "today";
let chartTrend   = null;
let chartCabang  = null;


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  const nama = localStorage.getItem("nama_bisnis");
  const role = localStorage.getItem("role");

  document.getElementById("tenantInfo").innerText  = nama || "Toko Saya";
  document.getElementById("storeName").innerText   = nama || "Warungin";
  document.getElementById("roleText").innerText    = role ? role.toUpperCase() : "OWNER";

  setPeriode("today");
  loadDashboardMeta();

  // Buka modal sesuai hash (dari klik sidebar)
  handleHash();
});

function handleHash() {
  var hash = window.location.hash;
  if (hash === "#cabang") {
    openModal("modal-kelola-cabang");
    loadCabangList();
    history.replaceState(null, "", "dashboard");
  } else if (hash === "#staff") {
    openModal("modal-kelola-staff");
    loadStafList();
    history.replaceState(null, "", "dashboard");
  }
}

window.addEventListener("hashchange", handleHash);


// ===== PERIOD SWITCH =====
function setPeriode(p) {
  aktivePeriode = p;
  document.querySelectorAll(".period-tab").forEach(function(btn) {
    btn.classList.toggle("active", btn.dataset.p === p);
  });
  loadAnalitik();
}


// ===== META (cabang count + produk stats) =====
function loadDashboardMeta() {
  apiPost("getDashboardStats")
    .then(function(res) {
      if (res.status !== "success") return;
      var d = res.data;
      document.getElementById("a-stok-habis").innerText    = d.stok_habis   || 0;
      document.getElementById("a-produk-badge").innerText  = (d.total_produk || 0) + " total produk";
      var bc = document.getElementById("badge-cabang");
      var bs = document.getElementById("badge-staff");
      if (bc) bc.innerText = d.total_cabang || 0;
      if (bs) bs.innerText = d.total_staff  || 0;
    })
    .catch(function() {});
}


// ===== LOAD ANALITIK =====
function loadAnalitik() {
  setKpiLoading(true);

  apiPost("getAnalitik", { periode: aktivePeriode })
    .then(function(res) {
      setKpiLoading(false);
      if (res.status === "success") {
        renderAnalitik(res.data);
      } else {
        renderAnalitikEmpty();
      }
    })
    .catch(function() {
      setKpiLoading(false);
      renderAnalitikEmpty();
    });
}

function setKpiLoading(on) {
  var ids = ["a-pendapatan","a-keuntungan","a-transaksi"];
  ids.forEach(function(id) {
    document.getElementById(id).innerText = on ? "..." : "—";
  });
}

function renderAnalitikEmpty() {
  document.getElementById("a-pendapatan").innerText     = "Rp 0";
  document.getElementById("a-keuntungan").innerText     = "Rp 0";
  document.getElementById("a-transaksi").innerText      = "0";
  document.getElementById("a-transaksi-badge").innerText = "0 transaksi";
  document.getElementById("a-margin-badge").innerText   = "0% margin";
  document.getElementById("a-avg-badge").innerText      = "Avg Rp 0";

  document.getElementById("cabang-performa").innerHTML =
    '<div class="empty-state"><div class="empty-icon">&#128202;</div><p>Belum ada data penjualan</p></div>';
  document.getElementById("top-produk").innerHTML =
    '<div class="empty-state" style="padding:40px;"><div class="empty-icon">&#128230;</div><p>Belum ada transaksi</p></div>';

  renderTrendChart([], aktivePeriode);
  renderCabangChart([]);
}


// ===== RENDER ALL =====
function renderAnalitik(data) {
  var r = data.ringkasan || {};
  var pendapatan  = r.pendapatan  || 0;
  var keuntungan  = r.keuntungan  || 0;
  var transaksi   = r.transaksi   || 0;
  var margin      = r.margin      || 0;
  var avgTrx      = transaksi > 0 ? Math.round(pendapatan / transaksi) : 0;

  document.getElementById("a-pendapatan").innerText     = formatRupiah(pendapatan);
  document.getElementById("a-keuntungan").innerText     = formatRupiah(keuntungan);
  document.getElementById("a-transaksi").innerText      = transaksi;
  document.getElementById("a-transaksi-badge").innerText = transaksi + " transaksi";
  document.getElementById("a-margin-badge").innerText   = margin + "% margin";
  document.getElementById("a-avg-badge").innerText      = "Avg " + formatRupiah(avgTrx);

  renderTrendChart(data.trend || [], aktivePeriode);
  renderCabangChart(data.per_cabang || []);
  renderCabangPerforma(data.per_cabang || []);
  renderTopProduk(data.top_produk || []);
}


// ===== CHART: TREND =====
function renderTrendChart(trend, periode) {
  var ctx = document.getElementById("chart-trend").getContext("2d");

  if (chartTrend) { chartTrend.destroy(); chartTrend = null; }

  var labels     = trend.map(function(t) { return t.tanggal; });
  var pendData   = trend.map(function(t) { return t.pendapatan; });
  var keuntData  = trend.map(function(t) { return t.keuntungan; });

  chartTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Pendapatan",
          data: pendData,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.08)",
          tension: 0.4,
          fill: true,
          pointRadius: periode === "today" ? 4 : 3,
          pointBackgroundColor: "#22c55e",
          borderWidth: 2
        },
        {
          label: "Keuntungan",
          data: keuntData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.06)",
          tension: 0.4,
          fill: true,
          pointRadius: periode === "today" ? 4 : 3,
          pointBackgroundColor: "#3b82f6",
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: { color: "#94A3B8", font: { size: 11 }, boxWidth: 12, padding: 16 }
        },
        tooltip: {
          backgroundColor: "#0F172A",
          borderColor: "#1E3050",
          borderWidth: 1,
          titleColor: "#CBD5E1",
          bodyColor: "#94A3B8",
          callbacks: {
            label: function(ctx) {
              return " " + ctx.dataset.label + ": " + formatRupiah(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 10 } },
          grid:  { color: "rgba(30,48,80,0.6)" }
        },
        y: {
          ticks: {
            color: "#475569", font: { size: 10 },
            callback: function(v) {
              if (v >= 1000000) return "Rp " + (v/1000000).toFixed(1) + "jt";
              if (v >= 1000)    return "Rp " + (v/1000).toFixed(0) + "rb";
              return "Rp " + v;
            }
          },
          grid: { color: "rgba(30,48,80,0.6)" }
        }
      }
    }
  });
}


// ===== CHART: PER CABANG =====
function renderCabangChart(perCabang) {
  var ctx = document.getElementById("chart-cabang").getContext("2d");
  if (chartCabang) { chartCabang.destroy(); chartCabang = null; }

  if (!perCabang || perCabang.length === 0) {
    chartCabang = new Chart(ctx, {
      type: "bar",
      data: { labels: ["Belum ada data"], datasets: [{ data: [0], backgroundColor: "#1E3050" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    return;
  }

  var labels   = perCabang.map(function(c) { return c.nama; });
  var pendData = perCabang.map(function(c) { return c.pendapatan; });
  var keuntData= perCabang.map(function(c) { return c.keuntungan; });

  chartCabang = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Pendapatan",
          data: pendData,
          backgroundColor: "rgba(34,197,94,0.7)",
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: "Keuntungan",
          data: keuntData,
          backgroundColor: "rgba(59,130,246,0.7)",
          borderRadius: 6,
          borderSkipped: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#94A3B8", font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: "#0F172A",
          borderColor: "#1E3050",
          borderWidth: 1,
          titleColor: "#CBD5E1",
          bodyColor: "#94A3B8",
          callbacks: {
            label: function(ctx) {
              return " " + ctx.dataset.label + ": " + formatRupiah(ctx.parsed.y);
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: "#475569", font: { size: 11 } }, grid: { display: false } },
        y: {
          ticks: {
            color: "#475569", font: { size: 10 },
            callback: function(v) {
              if (v >= 1000000) return "Rp " + (v/1000000).toFixed(1) + "jt";
              if (v >= 1000)    return "Rp " + (v/1000).toFixed(0) + "rb";
              return "Rp " + v;
            }
          },
          grid: { color: "rgba(30,48,80,0.6)" }
        }
      }
    }
  });
}


// ===== RENDER: PERFORMA CABANG =====
var rankEmoji = ["", "&#129351;", "&#129352;", "&#129353;"];

function renderCabangPerforma(perCabang) {
  var wrap = document.getElementById("cabang-performa");
  if (!perCabang || perCabang.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">&#127978;</div><p>Belum ada data penjualan per cabang</p></div>';
    return;
  }

  wrap.innerHTML = "";
  perCabang.forEach(function(c, i) {
    var rank      = i + 1;
    var rankCls   = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
    var emoji     = rankEmoji[rank] || "&#9679;";
    var margin    = c.pendapatan > 0 ? Math.round(c.keuntungan / c.pendapatan * 100) : 0;
    var marginPct = Math.min(100, Math.max(0, margin));

    var card = document.createElement("div");
    card.className = "cabang-perf-card " + rankCls;
    card.innerHTML =
      '<div class="cabang-perf-top">' +
        '<div class="cabang-perf-rank">' + emoji + '</div>' +
        '<div class="cabang-perf-nama">' + c.nama + '</div>' +
        '<span class="badge ' + (margin >= 20 ? "badge-green" : margin >= 5 ? "badge-yellow" : "badge-red") + '">' + margin + '%</span>' +
      '</div>' +
      '<div class="cabang-perf-stats">' +
        '<div>' +
          '<div class="cabang-perf-stat-label">Pendapatan</div>' +
          '<div class="cabang-perf-stat-val green">' + formatRupiah(c.pendapatan) + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="cabang-perf-stat-label">Keuntungan</div>' +
          '<div class="cabang-perf-stat-val blue">' + formatRupiah(c.keuntungan) + '</div>' +
        '</div>' +
        '<div>' +
          '<div class="cabang-perf-stat-label">Transaksi</div>' +
          '<div class="cabang-perf-stat-val">' + c.transaksi + 'x</div>' +
        '</div>' +
        '<div>' +
          '<div class="cabang-perf-stat-label">Avg / Trx</div>' +
          '<div class="cabang-perf-stat-val">' + (c.transaksi > 0 ? formatRupiah(Math.round(c.pendapatan / c.transaksi)) : "Rp 0") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="cabang-perf-margin-bar">' +
        '<div class="cabang-perf-margin-fill" style="width:' + marginPct + '%"></div>' +
      '</div>' +
      '<div class="cabang-perf-margin-label">' +
        '<span>Margin Keuntungan</span><span>' + margin + '%</span>' +
      '</div>';

    wrap.appendChild(card);
  });
}


// ===== RENDER: TOP PRODUK =====
function renderTopProduk(topProduk) {
  var wrap = document.getElementById("top-produk");
  if (!topProduk || topProduk.length === 0) {
    wrap.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="empty-icon">&#128230;</div><p>Belum ada data produk terjual</p></div>';
    return;
  }

  var maxQty = topProduk[0].qty || 1;
  var rankCls = ["gold","silver","bronze","",""];

  var html =
    '<div class="top-produk-header">' +
      '<div>#</div><div>Produk</div><div>Terjual</div><div>Pendapatan</div><div>Bar</div>' +
    '</div>';

  topProduk.forEach(function(p, i) {
    var pct = Math.round((p.qty / maxQty) * 100);
    html +=
      '<div class="top-produk-row">' +
        '<div class="top-produk-rank ' + (rankCls[i] || "") + '">' + (i + 1) + '</div>' +
        '<div><div class="top-produk-nama">' + p.nama + '</div></div>' +
        '<div class="top-produk-num">' + p.qty + ' pcs</div>' +
        '<div class="top-produk-rp">' + formatRupiah(p.pendapatan) + '</div>' +
        '<div class="top-produk-bar-wrap"><div class="top-produk-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
  });

  wrap.innerHTML = html;
}


// ===================================
//  CABANG MANAGEMENT
// ===================================

function loadCabangList() {
  var wrap = document.getElementById("cabang-list-wrap");
  wrap.innerHTML = '<div class="manage-list-loading">Memuat...</div>';

  apiPost("getCabang")
    .then(function(res) {
      dataCabang = res.data || [];
      renderCabangList(dataCabang);
      populateCabangSelect();
      var bc = document.getElementById("badge-cabang");
      if (bc) bc.innerText = dataCabang.length;
    })
    .catch(function() {
      wrap.innerHTML = '<div class="manage-list-empty">Gagal memuat</div>';
    });
}

function renderCabangList(list) {
  updateLimitUI("cabang-limit-count", "cabang-limit-fill", "btn-tambah-cabang", (list || []).length, 5);
  var wrap = document.getElementById("cabang-list-wrap");
  wrap.innerHTML = "";
  if (!list || list.length === 0) {
    wrap.innerHTML = '<div class="manage-list-empty">&#127978; Belum ada cabang. Tambah cabang pertama!</div>';
    return;
  }
  list.forEach(function(c) {
    var item = document.createElement("div");
    item.className = "manage-list-item";
    item.innerHTML =
      '<div class="manage-list-icon blue">&#127978;</div>' +
      '<div class="manage-list-info">' +
        '<div class="manage-list-nama">' + c.nama + '</div>' +
        '<div class="manage-list-sub">' + (c.alamat || 'Alamat belum diset') + (c.telepon ? ' &bull; ' + c.telepon : '') + '</div>' +
      '</div>' +
      '<div class="manage-list-actions">' +
        '<button class="manage-act-btn edit"  onclick="editCabang(\'' + c.id + '\')">&#9998;</button>' +
        '<button class="manage-act-btn hapus" onclick="konfirmHapusCabang(\'' + c.id + '\')">&#128465;</button>' +
      '</div>';
    wrap.appendChild(item);
  });
}

function openFormCabang() {
  document.getElementById("form-cabang-title").innerText = "Tambah Cabang";
  document.getElementById("c-nama").value    = "";
  document.getElementById("c-alamat").value  = "";
  document.getElementById("c-telepon").value = "";
  document.getElementById("c-edit-id").value = "";
  document.getElementById("c-btn-save").innerText = "Simpan Cabang";
  openModal("modal-form-cabang");
}

function editCabang(id) {
  var c = dataCabang.find(function(x) { return String(x.id) === String(id); });
  if (!c) return;
  document.getElementById("form-cabang-title").innerText = "Edit Cabang";
  document.getElementById("c-nama").value    = c.nama;
  document.getElementById("c-alamat").value  = c.alamat  || "";
  document.getElementById("c-telepon").value = c.telepon || "";
  document.getElementById("c-edit-id").value = c.id;
  document.getElementById("c-btn-save").innerText = "Simpan Perubahan";
  openModal("modal-form-cabang");
}

function simpanCabang() {
  var nama    = document.getElementById("c-nama").value.trim();
  var alamat  = document.getElementById("c-alamat").value.trim();
  var telepon = document.getElementById("c-telepon").value.trim();
  var editId  = document.getElementById("c-edit-id").value;

  if (!nama) { showToast("Nama cabang wajib diisi!", "warning"); return; }

  var btn = document.getElementById("c-btn-save");
  btn.disabled = true; btn.innerText = "Menyimpan...";

  var action  = editId ? "updateCabang" : "addCabang";
  var payload = { nama: nama, alamat: alamat, telepon: telepon };
  if (editId) payload.id = editId;

  apiPost(action, payload)
    .then(function(res) {
      if (res.status === "success") {
        closeModal("modal-form-cabang");
        loadCabangList();
        loadDashboardMeta();
      } else {
        showToast(res.message || "Gagal menyimpan", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() { btn.disabled = false; btn.innerText = editId ? "Simpan Perubahan" : "Simpan Cabang"; });
}

function konfirmHapusCabang(id) {
  showConfirm("Hapus cabang ini? Stok dan transaksi terkait tidak ikut terhapus.", function() {
    apiPost("deleteCabang", { id: id })
      .then(function(res) {
        if (res.status === "success") { loadCabangList(); loadDashboardMeta(); }
        else showToast(res.message || "Gagal menghapus", "error");
      })
      .catch(function() { showToast("Koneksi gagal", "error"); });
  }, { danger: true, yesText: "Ya, Hapus", title: "Hapus Cabang?" });
}

function populateCabangSelect() {
  var sel = document.getElementById("s-cabang");
  if (!sel) return;
  sel.innerHTML = '<option value="">Pilih cabang...</option>';
  dataCabang.forEach(function(c) {
    var opt = document.createElement("option");
    opt.value = c.id; opt.textContent = c.nama;
    sel.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", function() {
  var btnCabang = document.querySelector('[onclick*="modal-kelola-cabang"]');
  if (btnCabang) btnCabang.addEventListener("click", loadCabangList);
});


// ===================================
//  STAFF MANAGEMENT
// ===================================

function loadStafList() {
  var wrap = document.getElementById("staff-list-wrap");
  wrap.innerHTML = '<div class="manage-list-loading">Memuat...</div>';

  var loadCabangFirst = dataCabang.length === 0
    ? apiPost("getCabang").then(function(r) { dataCabang = r.data || []; populateCabangSelect(); })
    : Promise.resolve();

  loadCabangFirst.then(function() {
    return apiPost("getStaf");
  }).then(function(res) {
    dataStaf = res.data || [];
    renderStafList(dataStaf);
    var bs = document.getElementById("badge-staff");
    if (bs) bs.innerText = dataStaf.length;
  }).catch(function() {
    wrap.innerHTML = '<div class="manage-list-empty">Gagal memuat</div>';
  });
}

function renderStafList(list) {
  updateLimitUI("staff-limit-count", "staff-limit-fill", "btn-tambah-staf", (list || []).length, 5);
  var wrap = document.getElementById("staff-list-wrap");
  wrap.innerHTML = "";
  if (!list || list.length === 0) {
    wrap.innerHTML = '<div class="manage-list-empty">&#128101; Belum ada staff. Tambah staff pertama!</div>';
    return;
  }
  list.forEach(function(s) {
    var item = document.createElement("div");
    item.className = "manage-list-item";
    item.innerHTML =
      '<div class="manage-list-icon purple">&#128101;</div>' +
      '<div class="manage-list-info">' +
        '<div class="manage-list-nama">' + s.nama + '</div>' +
        '<div class="manage-list-sub">' + s.email + ' &bull; ' + (s.cabang_nama || '-') + '</div>' +
      '</div>' +
      '<div class="manage-list-actions">' +
        '<button class="manage-act-btn edit"  onclick="editStaf(\'' + s.id + '\')">&#9998;</button>' +
        '<button class="manage-act-btn hapus" onclick="hapusStaf(\'' + s.id + '\')">&#128465;</button>' +
      '</div>';
    wrap.appendChild(item);
  });
}

function openFormStaf() {
  document.getElementById("form-staf-title").innerText = "Tambah Staff";
  document.getElementById("s-nama").value     = "";
  document.getElementById("s-email").value    = "";
  document.getElementById("s-password").value = "";
  document.getElementById("s-cabang").value   = "";
  document.getElementById("s-edit-id").value  = "";
  document.getElementById("s-btn-save").innerText = "Simpan Staff";
  openModal("modal-form-staf");
}

function editStaf(id) {
  var s = dataStaf.find(function(x) { return String(x.id) === String(id); });
  if (!s) return;
  document.getElementById("form-staf-title").innerText = "Edit Staff";
  document.getElementById("s-nama").value     = s.nama;
  document.getElementById("s-email").value    = s.email;
  document.getElementById("s-password").value = "";
  document.getElementById("s-cabang").value   = s.cabang_id;
  document.getElementById("s-edit-id").value  = s.id;
  document.getElementById("s-btn-save").innerText = "Simpan Perubahan";
  openModal("modal-form-staf");
}

function simpanStaf() {
  var nama     = document.getElementById("s-nama").value.trim();
  var email    = document.getElementById("s-email").value.trim();
  var password = document.getElementById("s-password").value;
  var cabangId = document.getElementById("s-cabang").value;
  var editId   = document.getElementById("s-edit-id").value;

  if (!nama)     { showToast("Nama wajib diisi!", "warning"); return; }
  if (!email)    { showToast("Email wajib diisi!", "warning"); return; }
  if (!editId && !password) { showToast("Password wajib diisi!", "warning"); return; }
  if (!cabangId) { showToast("Pilih cabang terlebih dahulu!", "warning"); return; }

  var btn = document.getElementById("s-btn-save");
  btn.disabled = true; btn.innerText = "Menyimpan...";

  var action  = editId ? "updateStaf" : "addStaf";
  var payload = { nama: nama, email: email, cabang_id: cabangId, role: "staff" };
  if (password) payload.password = password;
  if (editId)   payload.id = editId;

  apiPost(action, payload)
    .then(function(res) {
      if (res.status === "success") {
        closeModal("modal-form-staf");
        loadStafList();
        loadDashboardMeta();
      } else {
        showToast(res.message || "Gagal menyimpan", "error");
      }
    })
    .catch(function() { showToast("Koneksi gagal", "error"); })
    .finally(function() { btn.disabled = false; btn.innerText = editId ? "Simpan Perubahan" : "Simpan Staff"; });
}

function hapusStaf(id) {
  showConfirm("Hapus staff ini? Akun login mereka akan nonaktif.", function() {
    apiPost("deleteStaf", { id: id })
      .then(function(res) {
        if (res.status === "success") { loadStafList(); loadDashboardMeta(); }
        else showToast(res.message || "Gagal menghapus", "error");
      })
      .catch(function() { showToast("Koneksi gagal", "error"); });
  }, { danger: true, yesText: "Ya, Hapus", title: "Hapus Staff?" });
}

document.addEventListener("DOMContentLoaded", function() {
  var btnStaff = document.querySelector('[onclick*="modal-kelola-staff"]');
  if (btnStaff) btnStaff.addEventListener("click", loadStafList);
});
