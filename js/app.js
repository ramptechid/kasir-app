// ===================================
//  APP.JS — Shared Functions
//  Warungin POS
// ===================================

// ===== API CONFIG =====
// Ganti URL ini setelah deploy ulang code.gs
const API_URL = "https://script.google.com/macros/s/AKfycbyYLXYJNq7PE8Tr2HtAmTyykpgXB4nCZoBBDLrt6rT5E_s5wFl-VSUhHi3rJXnVUHo/exec";

function apiPost(action, extraData) {
  const tenant_id = localStorage.getItem("tenant_id");
  if (!tenant_id) { window.location.href = "login"; return Promise.reject(); }

  return fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(Object.assign({ action: action, tenant_id: tenant_id }, extraData || {}))
  }).then(function(r) { return r.json(); });
}


// ===== SESSION HELPERS =====
function getRole()     { return localStorage.getItem("role")      || "staff"; }
function getCabangId() { return localStorage.getItem("cabang_id") || ""; }
function isOwner()     { return getRole() === "owner"; }


// ===== SIDEBAR =====
function loadSidebar(activePage) {
  const wrap = document.getElementById("sidebar-wrap");
  if (!wrap) return;

  fetch("components/sidebar.html")
    .then(function(r) { return r.text(); })
    .then(function(html) {
      wrap.innerHTML = html;

      // Sembunyikan elemen owner-only untuk staff
      if (!isOwner()) {
        wrap.querySelectorAll("[data-role='owner']").forEach(function(el) {
          el.style.display = "none";
        });
      }

      // Set active link
      if (activePage) {
        const link = wrap.querySelector('[data-page="' + activePage + '"]');
        if (link) link.classList.add("active");
      }

      const overlay = document.getElementById("overlay");
      if (overlay) overlay.addEventListener("click", closeSidebar);
    })
    .catch(function(e) { console.error("Sidebar gagal dimuat:", e); });
}

function toggleSidebar() {
  const s = document.getElementById("sidebar");
  const o = document.getElementById("overlay");
  if (s) s.classList.toggle("open");
  if (o) o.classList.toggle("show");
}

function closeSidebar() {
  const s = document.getElementById("sidebar");
  const o = document.getElementById("overlay");
  if (s) s.classList.remove("open");
  if (o) o.classList.remove("show");
}


// ===== MODAL =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "flex";
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "none";
}

document.addEventListener("click", function(e) {
  if (e.target && e.target.classList && e.target.classList.contains("modal")) {
    e.target.style.display = "none";
  }
});


// ===== ROLE BADGE =====
function setRoleBadge() {
  var el = document.getElementById("roleText");
  if (!el) return;

  var role = getRole();
  el.innerText = role.toUpperCase();

  if (role === "staff") {
    var staffNama  = localStorage.getItem("staff_nama")  || "";
    var cabangNama = localStorage.getItem("cabang_nama") || "";
    var infoText   = [staffNama, cabangNama].filter(Boolean).join(" · ");

    if (infoText && !document.getElementById("topbar-user-info")) {
      var wrapper = document.createElement("div");
      wrapper.className = "topbar-user";
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      var infoEl = document.createElement("div");
      infoEl.id        = "topbar-user-info";
      infoEl.className = "topbar-user-info";
      infoEl.innerText = infoText;
      wrapper.appendChild(infoEl);
    }
  }
}

document.addEventListener("DOMContentLoaded", setRoleBadge);


// ===== FORMAT RUPIAH =====
function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}


// ===== LIMIT UI HELPER =====
// countId: id elemen angka, fillId: id bar fill, btnId: id tombol add
function updateLimitUI(countId, fillId, btnId, count, max) {
  var pct     = max > 0 ? Math.min(100, Math.round(count / max * 100)) : 0;
  var countEl = countId ? document.getElementById(countId) : null;
  var fillEl  = fillId  ? document.getElementById(fillId)  : null;
  var btn     = btnId   ? document.getElementById(btnId)   : null;
  if (countEl) countEl.innerText = count;
  if (fillEl) {
    fillEl.style.width = pct + "%";
    fillEl.className   = "limit-fill" + (count >= max ? " full" : pct >= 80 ? " warn" : "");
  }
  if (btn) {
    btn.disabled = count >= max;
    btn.title    = count >= max ? "Batas maksimal " + max + " telah tercapai" : "";
  }
}

function updateSectionBadge(badgeId, count, max, warnAt) {
  var el = document.getElementById(badgeId);
  if (!el) return;
  el.innerText  = count + "/" + max;
  el.className  = "section-count-badge" +
    (count >= max ? " full" : count >= (warnAt || max * 0.8) ? " warn" : "");
}


// ===== CABANG SELECTOR (shared untuk stok & kasir) =====
// Panggil initCabangBar(callback) dari halaman yang butuh selector cabang
function initCabangBar(onCabangSelected) {
  const bar = document.getElementById("cabang-bar");
  if (!bar) return;

  if (!isOwner()) {
    // Staff: pakai cabang_id yang sudah tersimpan, bar disembunyikan
    bar.style.display = "none";
    onCabangSelected(getCabangId());
    return;
  }

  // Owner: load cabang list dan tampilkan selector
  apiPost("getCabang")
    .then(function(res) {
      const sel = document.getElementById("cabang-selector");
      if (!sel) return;

      if (res.status === "success" && res.data && res.data.length > 0) {
        sel.innerHTML = "";
        res.data.forEach(function(c) {
          const opt = document.createElement("option");
          opt.value = c.id;
          opt.textContent = c.nama;
          sel.appendChild(opt);
        });
        bar.style.display = "flex";
        sel.onchange = function() { onCabangSelected(sel.value); };
        onCabangSelected(res.data[0].id);
      } else {
        // Owner belum punya cabang
        bar.style.display = "flex";
        sel.innerHTML = '<option value="">Belum ada cabang</option>';
        document.getElementById("cabang-bar-hint") && (document.getElementById("cabang-bar-hint").style.display = "block");
        onCabangSelected("");
      }
    })
    .catch(function() { onCabangSelected(""); });
}
