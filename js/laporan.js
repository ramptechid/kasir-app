// =====================================
//  LAPORAN.JS — Reports & Export
// =====================================

var laporanData = null;

var METODE_LABEL = {
  tunai:    "Tunai (Cash)",
  transfer: "Transfer Bank",
  qris:     "QRIS",
  kartu:    "Kartu Debit/Kredit"
};
var METODE_COLOR = {
  tunai:    "#22c55e",
  transfer: "#3b82f6",
  qris:     "#a855f7",
  kartu:    "#f97316"
};


// ===== DATE HELPERS =====
function formatDateInput(d) {
  var y  = d.getFullYear();
  var m  = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + dd;
}

function setQuick(preset, btn) {
  document.querySelectorAll(".lq-tab").forEach(function(t) { t.classList.remove("active"); });
  if (btn) btn.classList.add("active");

  var now    = new Date();
  var dari   = new Date();
  var sampai = new Date();

  if (preset === "today") {
    // dari = sampai = today (default)
  } else if (preset === "week") {
    dari = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  } else if (preset === "month") {
    dari = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "lastmonth") {
    dari   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    sampai = new Date(now.getFullYear(), now.getMonth(), 0);
  }

  document.getElementById("lap-dari").value   = formatDateInput(dari);
  document.getElementById("lap-sampai").value = formatDateInput(sampai);
  loadLaporan();
}


// ===== LOAD CABANG FILTER =====
function loadCabangFilter() {
  apiPost("getCabang")
    .then(function(res) {
      var sel = document.getElementById("lap-cabang");
      if (!sel) return;
      // Remove all options except "Semua Cabang"
      while (sel.options.length > 1) sel.remove(1);
      if (res.status === "success" && res.data && res.data.length > 0) {
        res.data.forEach(function(c) {
          var opt = document.createElement("option");
          opt.value       = c.id;
          opt.textContent = "\u{1F3EA} " + c.nama;
          sel.appendChild(opt);
        });
      }
    })
    .catch(function() {});
}


// ===== LOAD DATA =====
function loadLaporan() {
  var dari     = document.getElementById("lap-dari").value;
  var sampai   = document.getElementById("lap-sampai").value;
  var cabangId = (document.getElementById("lap-cabang") || {}).value || "";
  if (!dari || !sampai) { showToast("Pilih tanggal terlebih dahulu", "warning"); return; }

  var loading = '<div class="lap-empty">Memuat data...</div>';
  document.getElementById("l-tx-table").innerHTML     = loading;
  document.getElementById("l-metode-list").innerHTML  = loading;
  document.getElementById("l-jam-list").innerHTML     = loading;
  document.getElementById("btn-export").disabled      = true;
  laporanData = null;

  apiPost("getLaporan", { dari: dari, sampai: sampai, cabang_id: cabangId })
    .then(function(res) {
      if (res.status !== "success") {
        showToast(res.message || "Gagal memuat laporan", "error");
        return;
      }
      laporanData = res.data;
      renderSummary(res.data.summary);
      renderMetode(res.data.per_metode);
      renderJam(res.data.per_jam);
      renderTxTable(res.data.transaksi);
      document.getElementById("btn-export").disabled = res.data.transaksi.length === 0;
    })
    .catch(function() {
      var err = '<div class="lap-empty">&#10060; Koneksi gagal</div>';
      document.getElementById("l-tx-table").innerHTML    = err;
      document.getElementById("l-metode-list").innerHTML = err;
      document.getElementById("l-jam-list").innerHTML    = err;
    });
}


// ===== SUMMARY =====
function renderSummary(s) {
  document.getElementById("l-pendapatan").innerText  = formatRupiah(s.pendapatan || 0);
  document.getElementById("l-transaksi").innerText   = (s.transaksi || 0) + " tx";
  document.getElementById("l-avg").innerText         = formatRupiah(s.avg || 0);
  var m = s.top_metode || "-";
  document.getElementById("l-top-metode").innerText  = METODE_LABEL[m] || m;
}


// ===== METODE PEMBAYARAN =====
function renderMetode(perMetode) {
  var wrap = document.getElementById("l-metode-list");
  var keys = Object.keys(perMetode || {});
  if (keys.length === 0) {
    wrap.innerHTML = '<div class="lap-empty">Tidak ada transaksi</div>';
    return;
  }

  var totalNominal = keys.reduce(function(s, k) { return s + (perMetode[k] || 0); }, 0);
  keys.sort(function(a, b) { return perMetode[b] - perMetode[a]; });

  wrap.innerHTML = "";
  keys.forEach(function(k) {
    var val  = perMetode[k] || 0;
    var pct  = totalNominal > 0 ? Math.round(val / totalNominal * 100) : 0;
    var lbl  = METODE_LABEL[k] || k;
    var clr  = METODE_COLOR[k] || "#94A3B8";

    var row = document.createElement("div");
    row.className = "metode-row";
    row.innerHTML =
      '<div class="metode-info">' +
        '<span class="metode-dot" style="background:' + clr + '"></span>' +
        '<span class="metode-nama">' + lbl + '</span>' +
        '<span class="metode-rp">' + formatRupiah(val) + '</span>' +
        '<span class="metode-pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="metode-bar-bg">' +
        '<div class="metode-bar-fill" style="width:' + pct + '%;background:' + clr + ';transition:width 0.6s ease;"></div>' +
      '</div>';
    wrap.appendChild(row);
  });
}


// ===== JAM TERSIBUK =====
function renderJam(perJam) {
  var wrap = document.getElementById("l-jam-list");
  var keys = Object.keys(perJam || {}).map(Number);
  if (keys.length === 0) {
    wrap.innerHTML = '<div class="lap-empty">Tidak ada transaksi</div>';
    return;
  }

  // Top 8 jam tersibuk
  keys.sort(function(a, b) { return perJam[b].transaksi - perJam[a].transaksi; });
  var top8 = keys.slice(0, 8);
  top8.sort(function(a, b) { return a - b; });

  var maxTx = Math.max.apply(null, top8.map(function(h) { return perJam[h].transaksi; }));

  wrap.innerHTML = "";
  top8.forEach(function(h) {
    var d   = perJam[h];
    var pct = maxTx > 0 ? Math.round(d.transaksi / maxTx * 100) : 0;
    var row = document.createElement("div");
    row.className = "jam-row";
    row.innerHTML =
      '<span class="jam-label">' + String(h).padStart(2, "0") + ".00" + '</span>' +
      '<div class="jam-bar-bg">' +
        '<div class="jam-bar-fill" style="width:' + pct + '%;transition:width 0.6s ease;"></div>' +
      '</div>' +
      '<span class="jam-count">' + d.transaksi + ' tx &middot; ' + formatRupiah(d.total) + '</span>';
    wrap.appendChild(row);
  });
}


// ===== TABEL TRANSAKSI =====
function renderTxTable(transaksi) {
  var wrap = document.getElementById("l-tx-table");
  if (!transaksi || transaksi.length === 0) {
    wrap.innerHTML = '<div class="lap-empty">Tidak ada transaksi pada periode ini</div>';
    return;
  }

  var rows = transaksi.map(function(tx, idx) {
    var clr       = METODE_COLOR[tx.metode_bayar] || "#94A3B8";
    var lbl       = METODE_LABEL[tx.metode_bayar] || tx.metode_bayar;
    var itemCount = tx.items.length;
    var itemTip   = tx.items.map(function(it) { return it.nama + " \xD7" + it.qty; }).join(", ");

    return '<tr>' +
      '<td class="tx-num">' + (idx + 1) + '</td>' +
      '<td class="tx-date">' + tx.tanggal + '</td>' +
      '<td><span class="tx-cabang-badge">' + tx.cabang_nama + '</span></td>' +
      '<td class="tx-items" title="' + itemTip + '">' +
        (itemCount > 0 ? itemCount + ' produk' : '-') +
      '</td>' +
      '<td class="tx-total">' + formatRupiah(tx.total) + '</td>' +
      '<td><span class="tx-metode-badge" style="color:' + clr + ';border-color:' + clr + '44;background:' + clr + '18;">' + lbl + '</span></td>' +
      '<td class="tx-kasir">' + (tx.kasir || '-') + '</td>' +
    '</tr>';
  }).join("");

  wrap.innerHTML =
    '<div style="overflow-x:auto;max-width:100%;">' +
    '<table class="lap-table">' +
      '<thead><tr>' +
        '<th>#</th>' +
        '<th>Tanggal</th>' +
        '<th>Cabang</th>' +
        '<th>Produk</th>' +
        '<th>Total</th>' +
        '<th>Metode</th>' +
        '<th>Kasir</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>' +
    '</div>' +
    '<div class="lap-tx-count">' + transaksi.length + ' transaksi ditemukan</div>';
}


// ===== EXPORT EXCEL =====
function exportExcel() {
  if (!laporanData || !laporanData.transaksi || laporanData.transaksi.length === 0) return;

  var dari    = document.getElementById("lap-dari").value;
  var sampai  = document.getElementById("lap-sampai").value;
  var cabSel  = document.getElementById("lap-cabang");
  var cabLabel = cabSel && cabSel.selectedIndex > 0
    ? cabSel.options[cabSel.selectedIndex].text.replace(/^\S+\s+/, "")  // hapus emoji
    : "Semua Cabang";
  var s       = laporanData.summary;
  var txList  = laporanData.transaksi;

  // ---- Sheet 1: Detail Transaksi ----
  var detailRows = [
    ["No", "ID Transaksi", "Tanggal", "Cabang", "Detail Produk", "Jml Item", "Total (Rp)", "Diskon (%)", "Metode Bayar", "Kasir"]
  ];

  txList.forEach(function(tx, idx) {
    var itemStr = tx.items.length > 0
      ? tx.items.map(function(it) { return it.nama + " x" + it.qty + " @Rp" + it.harga; }).join("; ")
      : "-";
    detailRows.push([
      idx + 1,
      tx.id,
      tx.tanggal,
      tx.cabang_nama,
      itemStr,
      tx.items.length,
      tx.total,
      tx.diskon || 0,
      METODE_LABEL[tx.metode_bayar] || tx.metode_bayar,
      tx.kasir || "-"
    ]);
  });

  // Ringkasan di bawah tabel
  detailRows.push([]);
  detailRows.push(["RINGKASAN PERIODE " + dari + " s/d " + sampai + " | Cabang: " + cabLabel]);
  detailRows.push(["Total Pendapatan (Rp)", s.pendapatan || 0]);
  detailRows.push(["Total Transaksi",       s.transaksi  || 0]);
  detailRows.push(["Rata-rata / Transaksi (Rp)", s.avg  || 0]);
  detailRows.push(["Metode Terbanyak", METODE_LABEL[s.top_metode] || s.top_metode || "-"]);

  var wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
  wsDetail["!cols"] = [
    { wch: 5  },  // No
    { wch: 20 },  // ID
    { wch: 20 },  // Tanggal
    { wch: 16 },  // Cabang
    { wch: 45 },  // Detail Produk
    { wch: 8  },  // Jml Item
    { wch: 16 },  // Total
    { wch: 10 },  // Diskon
    { wch: 20 },  // Metode
    { wch: 16 },  // Kasir
  ];

  // ---- Sheet 2: Metode Pembayaran ----
  var metodeRows = [["Metode", "Total (Rp)", "% Kontribusi"]];
  var totalNominal = Object.keys(laporanData.per_metode || {}).reduce(function(acc, k) {
    return acc + (laporanData.per_metode[k] || 0);
  }, 0);
  Object.keys(laporanData.per_metode || {})
    .sort(function(a, b) { return laporanData.per_metode[b] - laporanData.per_metode[a]; })
    .forEach(function(k) {
      var val = laporanData.per_metode[k] || 0;
      var pct = totalNominal > 0 ? Math.round(val / totalNominal * 100) : 0;
      metodeRows.push([METODE_LABEL[k] || k, val, pct + "%"]);
    });

  var wsMetode = XLSX.utils.aoa_to_sheet(metodeRows);
  wsMetode["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }];

  // ---- Sheet 3: Jam Tersibuk ----
  var jamRows = [["Jam", "Jumlah Transaksi", "Total (Rp)"]];
  var perJam  = laporanData.per_jam || {};
  Object.keys(perJam).map(Number).sort(function(a, b) { return a - b; }).forEach(function(h) {
    var d = perJam[h];
    jamRows.push([String(h).padStart(2, "0") + ":00", d.transaksi, d.total]);
  });

  var wsJam = XLSX.utils.aoa_to_sheet(jamRows);
  wsJam["!cols"] = [{ wch: 10 }, { wch: 18 }, { wch: 16 }];

  // ---- Buat workbook ----
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDetail,  "Transaksi");
  XLSX.utils.book_append_sheet(wb, wsMetode,  "Metode Bayar");
  XLSX.utils.book_append_sheet(wb, wsJam,     "Jam Tersibuk");

  var cabSlug = cabLabel === "Semua Cabang" ? "semua" : cabLabel.replace(/\s+/g, "_").toLowerCase();
  XLSX.writeFile(wb, "laporan_" + cabSlug + "_" + dari + "_sd_" + sampai + ".xlsx");
}


// ===== INIT =====
document.addEventListener("DOMContentLoaded", function() {
  loadCabangFilter();

  // Default: Bulan Ini (tab index 2)
  var tabs = document.querySelectorAll(".lq-tab");
  tabs.forEach(function(t) { t.classList.remove("active"); });
  if (tabs[2]) tabs[2].classList.add("active");

  var now      = new Date();
  var firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  document.getElementById("lap-dari").value   = formatDateInput(firstDay);
  document.getElementById("lap-sampai").value = formatDateInput(now);

  loadLaporan();
});
