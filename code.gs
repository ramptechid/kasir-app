// ===================================
//  CODE.GS — Warungin POS Backend
//  Google Apps Script
//  Ganti MASTER_SHEET_ID dengan ID spreadsheet master kamu
// ===================================

var MASTER_SHEET_ID  = "1U3zk0fWud4bBciEw1RLss8mq_08SRaqBB1RCpezXbL4";
var TENANT_FOLDER_ID = "1ctHq6IML2iz9WqcaKxCjp6WhXmgBsS1l";

function doPost(e) {
  try {
    var data   = JSON.parse(e.postData.contents);
    var action = data.action;
    switch (action) {
      case "login":             return respond(login(data));
      case "register":          return respond(register(data));
      case "getProducts":       return respond(getProducts(data));
      case "addProduct":        return respond(addProduct(data));
      case "updateProduct":     return respond(updateProduct(data));
      case "deleteProduct":     return respond(deleteProduct(data));
      case "getKategori":       return respond(getKategori(data));
      case "addKategori":       return respond(addKategori(data));
      case "updateKategori":    return respond(updateKategori(data));
      case "deleteKategori":    return respond(deleteKategori(data));
      case "getStok":           return respond(getStok(data));
      case "updateStok":        return respond(updateStok(data));
      case "getCabang":         return respond(getCabang(data));
      case "addCabang":         return respond(addCabang(data));
      case "updateCabang":      return respond(updateCabang(data));
      case "deleteCabang":      return respond(deleteCabang(data));
      case "getStaf":           return respond(getStaf(data));
      case "addStaf":           return respond(addStaf(data));
      case "updateStaf":        return respond(updateStaf(data));
      case "deleteStaf":        return respond(deleteStaf(data));
      case "addTransaksi":      return respond(addTransaksi(data));
      case "getTransaksi":      return respond(getTransaksi(data));
      case "getDashboardStats": return respond(getDashboardStats(data));
      case "getAnalitik":       return respond(getAnalitik(data));
      case "getStokProduk":    return respond(getStokProduk(data));
      case "getLaporan":        return respond(getLaporan(data));
      default: return respond({ status: "error", message: "Action tidak dikenal: " + action });
    }
  } catch(err) {
    return respond({ status: "error", message: err.toString() });
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(typeof obj === "string" ? obj : JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ===================================
//  HELPERS
// ===================================
function getTenantSS(tenantId) {
  return SpreadsheetApp.openById(tenantId);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, "").substring(0, 16);
}

function setupTenantSheet(ss) {
  getOrCreateSheet(ss, "products",          ["id","nama","harga","harga_modal","barcode","kategori","icon"]);
  getOrCreateSheet(ss, "kategori",          ["id","nama","icon","warna"]);
  getOrCreateSheet(ss, "cabang",            ["id","nama","alamat","telepon"]);
  getOrCreateSheet(ss, "stok",              ["id","product_id","cabang_id","qty"]);
  getOrCreateSheet(ss, "staff",             ["id","nama","email","password","cabang_id","role"]);
  getOrCreateSheet(ss, "transactions",      ["id","cabang_id","tanggal","total","diskon_persen","metode_bayar","kasir"]);
  getOrCreateSheet(ss, "transaction_items", ["id","transaction_id","product_id","nama","harga","qty"]);
}


// ===================================
//  AUTH
// ===================================
// users cols: [0]id [1]email [2]password [3]nama_bisnis [4]tenant_id

// tenants cols: [0]tenant_id [1]nama_bisnis [2]sheet_id [3]plan [4]expired_date
// users cols:   [0]user_id   [1]tenant_id   [2]email    [3]password [4]role

function register(data) {
  var email      = (data.email       || "").toLowerCase().trim();
  var password   = (data.password    || "").trim();
  var namaBisnis = (data.nama_bisnis || "").trim();

  if (!email || !password || !namaBisnis)
    return { status: "error", message: "Semua field wajib diisi" };
  if (password.length < 4)
    return { status: "error", message: "Password minimal 4 karakter" };

  var master       = SpreadsheetApp.openById(MASTER_SHEET_ID);
  var usersSheet   = getOrCreateSheet(master, "users",   ["user_id","tenant_id","email","password","role"]);
  var tenantsSheet = getOrCreateSheet(master, "tenants", ["tenant_id","nama_bisnis","sheet_id","plan","expired_date"]);

  // Cek email sudah terdaftar (col index 2 = email)
  var userRows = usersSheet.getDataRange().getValues();
  for (var i = 1; i < userRows.length; i++) {
    if (String(userRows[i][2]).toLowerCase().trim() === email)
      return { status: "error", message: "Email sudah terdaftar" };
  }

  // Buat spreadsheet baru khusus tenant ini, lalu pindah ke folder tenant
  var tenantSS = SpreadsheetApp.create("Warungin Data - " + namaBisnis);
  var sheetId  = tenantSS.getId();
  setupTenantSheet(tenantSS);

  // Pindahkan ke folder tenant di Drive
  try {
    var file         = DriveApp.getFileById(sheetId);
    var targetFolder = DriveApp.getFolderById(TENANT_FOLDER_ID);
    file.moveTo(targetFolder);
  } catch(e) { /* lanjut meski folder gagal diakses */ }

  // Simpan ke tenants
  var tenantId = generateId();
  tenantsSheet.appendRow([tenantId, namaBisnis, sheetId, "free", ""]);

  // Simpan ke users
  var userId = generateId();
  usersSheet.appendRow([userId, tenantId, email, password, "owner"]);

  return {
    status:    "success",
    message:   "Akun berhasil dibuat! Silakan login.",
    tenant_id: sheetId   // sheet_id dipakai sebagai tenant_id di localStorage
  };
}

function login(data) {
  var email    = (data.email    || "").toLowerCase().trim();
  var password = (data.password || "").trim();
  if (!email || !password) return { status: "error", message: "Email dan password wajib diisi" };

  var master       = SpreadsheetApp.openById(MASTER_SHEET_ID);
  var usersSheet   = master.getSheetByName("users");
  var tenantsSheet = master.getSheetByName("tenants");
  if (!usersSheet || !tenantsSheet) return { status: "error", message: "Konfigurasi master belum siap" };

  var userRows   = usersSheet.getDataRange().getValues();
  var tenantRows = tenantsSheet.getDataRange().getValues();

  // Build tenants map: tenant_id -> { sheet_id, nama_bisnis }
  var tenantMap = {};
  for (var i = 1; i < tenantRows.length; i++) {
    if (!tenantRows[i][0]) continue;
    tenantMap[String(tenantRows[i][0])] = {
      sheet_id:    String(tenantRows[i][2]),
      nama_bisnis: String(tenantRows[i][1])
    };
  }

  // Cek owner login (users col: [2]email [3]password [1]tenant_id [4]role)
  for (var i = 1; i < userRows.length; i++) {
    var r = userRows[i];
    if (String(r[2]).toLowerCase().trim() === email && String(r[3]).trim() === password) {
      var tenant = tenantMap[String(r[1])] || {};
      return {
        status:      "success",
        role:        "owner",
        tenant_id:   tenant.sheet_id    || "",
        nama_bisnis: tenant.nama_bisnis || "",
        cabang_id:   "",
        staff_id:    "",
        staff_nama:  ""
      };
    }
  }

  // Cek staff login — iterasi semua tenant
  for (var t = 1; t < tenantRows.length; t++) {
    var sheetId    = String(tenantRows[t][2]);
    var namaBisnis = String(tenantRows[t][1]);
    if (!sheetId) continue;
    try {
      var tss        = SpreadsheetApp.openById(sheetId);
      var staffSheet = tss.getSheetByName("staff");
      if (!staffSheet) continue;
      var sRows = staffSheet.getDataRange().getValues();
      // staff cols: [0]id [1]nama [2]email [3]password [4]cabang_id [5]role
      for (var s = 1; s < sRows.length; s++) {
        var sr = sRows[s];
        if (String(sr[2]).toLowerCase().trim() === email && String(sr[3]).trim() === password) {
          var cabNama = "";
          try {
            var cabSheet = tss.getSheetByName("cabang");
            if (cabSheet) {
              var cRows = cabSheet.getDataRange().getValues();
              for (var ci = 1; ci < cRows.length; ci++) {
                if (String(cRows[ci][0]) === String(sr[4])) {
                  cabNama = String(cRows[ci][1] || "");
                  break;
                }
              }
            }
          } catch(e) {}
          return {
            status:      "success",
            role:        "staff",
            tenant_id:   sheetId,
            nama_bisnis: namaBisnis,
            cabang_id:   String(sr[4]),
            cabang_nama: cabNama,
            staff_id:    String(sr[0]),
            staff_nama:  String(sr[1])
          };
        }
      }
    } catch(e) { continue; }
  }

  return { status: "error", message: "Email atau password salah" };
}


// ===================================
//  PRODUCTS
// ===================================
// products cols: [0]id [1]nama [2]harga [3]harga_modal [4]barcode [5]kategori [6]icon

function getProducts(data) {
  var tenantId = data.tenant_id;
  var cabangId = data.cabang_id ? String(data.cabang_id) : "";

  var ss     = getTenantSS(tenantId);
  var pSheet = ss.getSheetByName("products");
  if (!pSheet) return { status: "success", data: [] };

  // Build stok map jika ada cabang_id: hanya produk yang ADA di stok sheet = di-assign ke cabang ini
  var stokMap = {};   // product_id -> qty  (hanya yang assigned)
  if (cabangId) {
    var stokSheet = ss.getSheetByName("stok");
    if (stokSheet) {
      var stokRows = stokSheet.getDataRange().getValues();
      for (var i = 1; i < stokRows.length; i++) {
        if (String(stokRows[i][2]) === cabangId) {
          stokMap[String(stokRows[i][1])] = Number(stokRows[i][3]) || 0;
        }
      }
    }
  }

  var rows   = pSheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var pid = String(rows[i][0]);
    if (!pid) continue;
    // Jika ada filter cabang, hanya tampilkan produk yang sudah di-assign (ada di stokMap)
    if (cabangId && !stokMap.hasOwnProperty(pid)) continue;
    result.push({
      id:          pid,
      nama:        String(rows[i][1]),
      harga:       Number(rows[i][2]) || 0,
      harga_modal: Number(rows[i][3]) || 0,
      barcode:     String(rows[i][4] || ""),
      kategori:    String(rows[i][5] || ""),
      icon:        String(rows[i][6] || "&#128230;"),
      stok:        cabangId ? stokMap[pid] : 0
    });
  }
  return { status: "success", data: result };
}

function addProduct(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = getOrCreateSheet(ss, "products", ["id","nama","harga","harga_modal","barcode","kategori","icon"]);
  if (Math.max(0, sheet.getLastRow() - 1) >= 50)
    return { status: "error", message: "Batas maksimal 50 produk telah tercapai" };
  var id = generateId();
  sheet.appendRow([
    id,
    data.nama        || "",
    Number(data.harga)       || 0,
    Number(data.harga_modal) || 0,
    data.barcode     || "",
    data.kategori    || "",
    data.icon        || "&#128230;"
  ]);
  return { status: "success", message: "Produk berhasil ditambahkan", id: id };
}

function updateProduct(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("products");
  if (!sheet) return { status: "error", message: "Sheet products tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      var r = i + 1;
      sheet.getRange(r, 2).setValue(data.nama     !== undefined ? data.nama     : rows[i][1]);
      sheet.getRange(r, 3).setValue(data.harga    !== undefined ? Number(data.harga)       : rows[i][2]);
      sheet.getRange(r, 4).setValue(data.harga_modal !== undefined ? Number(data.harga_modal) : rows[i][3]);
      sheet.getRange(r, 5).setValue(data.barcode  !== undefined ? data.barcode  : rows[i][4]);
      sheet.getRange(r, 6).setValue(data.kategori !== undefined ? data.kategori : rows[i][5]);
      sheet.getRange(r, 7).setValue(data.icon     !== undefined ? data.icon     : rows[i][6]);
      return { status: "success", message: "Produk berhasil diupdate" };
    }
  }
  return { status: "error", message: "Produk tidak ditemukan" };
}

function deleteProduct(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("products");
  if (!sheet) return { status: "error", message: "Sheet products tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Produk berhasil dihapus" };
    }
  }
  return { status: "error", message: "Produk tidak ditemukan" };
}


// ===================================
//  KATEGORI
// ===================================
// kategori cols: [0]id [1]nama [2]icon

function getKategori(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("kategori");
  if (!sheet) return { status: "success", data: [] };

  // Hitung jumlah produk per nama kategori
  var countMap = {};
  var pSheet   = ss.getSheetByName("products");
  if (pSheet) {
    var pRows = pSheet.getDataRange().getValues();
    for (var i = 1; i < pRows.length; i++) {
      var katNama = String(pRows[i][5] || "").trim();
      if (katNama) countMap[katNama] = (countMap[katNama] || 0) + 1;
    }
  }

  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var nama = String(rows[i][1]);
    result.push({
      id:     String(rows[i][0]),
      nama:   nama,
      icon:   String(rows[i][2] || ""),
      warna:  String(rows[i][3] || ""),
      jumlah: countMap[nama] || 0
    });
  }
  return { status: "success", data: result };
}

function addKategori(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = getOrCreateSheet(ss, "kategori", ["id","nama","icon","warna"]);
  if (Math.max(0, sheet.getLastRow() - 1) >= 25)
    return { status: "error", message: "Batas maksimal 25 kategori telah tercapai" };
  var id = generateId();
  sheet.appendRow([id, data.nama || "", data.icon || "", data.warna || ""]);
  return { status: "success", message: "Kategori berhasil ditambahkan", id: id };
}

function updateKategori(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("kategori");
  if (!sheet) return { status: "error", message: "Sheet kategori tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 2).setValue(data.nama  !== undefined ? data.nama  : rows[i][1]);
      sheet.getRange(i + 1, 3).setValue(data.icon  !== undefined ? data.icon  : rows[i][2]);
      sheet.getRange(i + 1, 4).setValue(data.warna !== undefined ? data.warna : rows[i][3]);
      return { status: "success", message: "Kategori berhasil diupdate" };
    }
  }
  return { status: "error", message: "Kategori tidak ditemukan" };
}

function deleteKategori(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("kategori");
  if (!sheet) return { status: "error", message: "Sheet kategori tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Kategori berhasil dihapus" };
    }
  }
  return { status: "error", message: "Kategori tidak ditemukan" };
}


// ===================================
//  STOK
// ===================================
// stok cols: [0]id [1]product_id [2]cabang_id [3]qty

function getStok(data) {
  return getProducts(data);
}

function updateStok(data) {
  var tenantId  = data.tenant_id;
  var productId = String(data.product_id);
  var cabangId  = String(data.cabang_id);
  var type      = data.type || "tambah";
  var qty       = Number(data.qty) || 0;

  var ss        = getTenantSS(tenantId);
  var stokSheet = getOrCreateSheet(ss, "stok", ["id","product_id","cabang_id","qty"]);
  var rows      = stokSheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === productId && String(rows[i][2]) === cabangId) {
      if (type === "unassign") {
        stokSheet.deleteRow(i + 1);
        return { status: "success", message: "Produk dihapus dari cabang", stok: 0 };
      }
      var cur    = Number(rows[i][3]) || 0;
      var newQty = type === "tambah" ? cur + qty : type === "kurang" ? Math.max(0, cur - qty) : qty;
      stokSheet.getRange(i + 1, 4).setValue(newQty);
      return { status: "success", message: "Stok berhasil diupdate", stok: newQty };
    }
  }

  if (type === "unassign") return { status: "success", message: "Produk memang belum di-assign", stok: 0 };
  var initQty = type === "set" ? qty : (type === "tambah" ? qty : 0);
  stokSheet.appendRow([generateId(), productId, cabangId, initQty]);
  return { status: "success", message: "Stok berhasil diupdate", stok: initQty };
}


// ===================================
//  CABANG
// ===================================
// cabang cols: [0]id [1]nama [2]alamat [3]telepon

function getCabang(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("cabang");
  if (!sheet) return { status: "success", data: [] };

  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    result.push({ id: String(rows[i][0]), nama: String(rows[i][1]), alamat: String(rows[i][2] || ""), telepon: String(rows[i][3] || "") });
  }
  return { status: "success", data: result };
}

function addCabang(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = getOrCreateSheet(ss, "cabang", ["id","nama","alamat","telepon"]);
  if (Math.max(0, sheet.getLastRow() - 1) >= 5)
    return { status: "error", message: "Batas maksimal 5 cabang warung telah tercapai" };
  var id = generateId();
  sheet.appendRow([id, data.nama || "", data.alamat || "", data.telepon || ""]);
  return { status: "success", message: "Cabang berhasil ditambahkan", id: id };
}

function updateCabang(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("cabang");
  if (!sheet) return { status: "error", message: "Sheet cabang tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 2).setValue(data.nama    !== undefined ? data.nama    : rows[i][1]);
      sheet.getRange(i + 1, 3).setValue(data.alamat  !== undefined ? data.alamat  : rows[i][2]);
      sheet.getRange(i + 1, 4).setValue(data.telepon !== undefined ? data.telepon : rows[i][3]);
      return { status: "success", message: "Cabang berhasil diupdate" };
    }
  }
  return { status: "error", message: "Cabang tidak ditemukan" };
}

function deleteCabang(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("cabang");
  if (!sheet) return { status: "error", message: "Sheet cabang tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Cabang berhasil dihapus" };
    }
  }
  return { status: "error", message: "Cabang tidak ditemukan" };
}


// ===================================
//  STAFF
// ===================================
// staff cols: [0]id [1]nama [2]email [3]password [4]cabang_id [5]role

function getStaf(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("staff");
  if (!sheet) return { status: "success", data: [] };

  var cabangMap = {};
  var cabSheet  = ss.getSheetByName("cabang");
  if (cabSheet) {
    var cRows = cabSheet.getDataRange().getValues();
    for (var i = 1; i < cRows.length; i++) cabangMap[String(cRows[i][0])] = String(cRows[i][1]);
  }

  var rows = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    result.push({
      id:          String(rows[i][0]),
      nama:        String(rows[i][1]),
      email:       String(rows[i][2]),
      cabang_id:   String(rows[i][4]),
      cabang_nama: cabangMap[String(rows[i][4])] || "-",
      role:        String(rows[i][5] || "staff")
    });
  }
  return { status: "success", data: result };
}

function addStaf(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = getOrCreateSheet(ss, "staff", ["id","nama","email","password","cabang_id","role"]);
  if (Math.max(0, sheet.getLastRow() - 1) >= 5)
    return { status: "error", message: "Batas maksimal 5 staff telah tercapai" };
  var id = generateId();
  sheet.appendRow([id, data.nama || "", data.email || "", data.password || "", data.cabang_id || "", data.role || "staff"]);
  return { status: "success", message: "Staff berhasil ditambahkan", id: id };
}

function updateStaf(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("staff");
  if (!sheet) return { status: "error", message: "Sheet staff tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.getRange(i + 1, 2).setValue(data.nama      || rows[i][1]);
      sheet.getRange(i + 1, 3).setValue(data.email     || rows[i][2]);
      if (data.password) sheet.getRange(i + 1, 4).setValue(data.password);
      sheet.getRange(i + 1, 5).setValue(data.cabang_id || rows[i][4]);
      return { status: "success", message: "Staff berhasil diupdate" };
    }
  }
  return { status: "error", message: "Staff tidak ditemukan" };
}

function deleteStaf(data) {
  var ss    = getTenantSS(data.tenant_id);
  var sheet = ss.getSheetByName("staff");
  if (!sheet) return { status: "error", message: "Sheet staff tidak ditemukan" };

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Staff berhasil dihapus" };
    }
  }
  return { status: "error", message: "Staff tidak ditemukan" };
}


// ===================================
//  TRANSAKSI
// ===================================
// transactions cols:      [0]id [1]cabang_id [2]tanggal [3]total [4]diskon_persen [5]metode_bayar [6]kasir
// transaction_items cols: [0]id [1]transaction_id [2]product_id [3]nama [4]harga [5]qty

function addTransaksi(data) {
  var tenantId = data.tenant_id;
  var ss       = getTenantSS(tenantId);

  var txSheet   = getOrCreateSheet(ss, "transactions",      ["id","cabang_id","tanggal","total","diskon_persen","metode_bayar","kasir"]);
  var tiSheet   = getOrCreateSheet(ss, "transaction_items", ["id","transaction_id","product_id","nama","harga","qty"]);
  var stokSheet = getOrCreateSheet(ss, "stok",              ["id","product_id","cabang_id","qty"]);

  var txId     = generateId();
  var cabangId = String(data.cabang_id || "");

  txSheet.appendRow([txId, cabangId, new Date(), Number(data.total) || 0, Number(data.diskon_persen) || 0, data.metode_bayar || "tunai", data.kasir || ""]);

  var items     = data.items || [];
  var stokRows  = stokSheet.getDataRange().getValues();
  var stokCache = {};
  for (var i = 1; i < stokRows.length; i++) stokCache[String(stokRows[i][1]) + "|" + String(stokRows[i][2])] = i;

  items.forEach(function(item) {
    tiSheet.appendRow([generateId(), txId, String(item.product_id), item.nama || "", Number(item.harga) || 0, Number(item.qty) || 0]);

    if (cabangId) {
      var cacheKey = String(item.product_id) + "|" + cabangId;
      var rowIdx   = stokCache[cacheKey];
      if (rowIdx) {
        var cur = Number(stokSheet.getRange(rowIdx + 1, 4).getValue()) || 0;
        stokSheet.getRange(rowIdx + 1, 4).setValue(Math.max(0, cur - (Number(item.qty) || 0)));
      } else {
        stokSheet.appendRow([generateId(), String(item.product_id), cabangId, 0]);
      }
    }
  });

  return { status: "success", message: "Transaksi berhasil disimpan", id: txId };
}

function getTransaksi(data) {
  var ss      = getTenantSS(data.tenant_id);
  var txSheet = ss.getSheetByName("transactions");
  if (!txSheet) return { status: "success", data: [] };

  var rows   = txSheet.getDataRange().getValues();
  var result = [];
  var limit  = Number(data.limit) || 50;

  for (var i = rows.length - 1; i >= 1 && result.length < limit; i--) {
    if (!rows[i][0]) continue;
    result.push({
      id:            String(rows[i][0]),
      cabang_id:     String(rows[i][1]),
      tanggal:       rows[i][2],
      total:         Number(rows[i][3]) || 0,
      diskon_persen: Number(rows[i][4]) || 0,
      metode_bayar:  String(rows[i][5] || "tunai"),
      kasir:         String(rows[i][6] || "")
    });
  }
  return { status: "success", data: result };
}


// ===================================
//  DASHBOARD STATS
// ===================================
function getDashboardStats(data) {
  var ss    = getTenantSS(data.tenant_id);
  var today = new Date(); today.setHours(0, 0, 0, 0);

  var pendapatanHari = 0, transaksiHari = 0;
  var txSheet = ss.getSheetByName("transactions");
  if (txSheet) {
    var txRows = txSheet.getDataRange().getValues();
    for (var i = 1; i < txRows.length; i++) {
      var tgl = new Date(txRows[i][2]);
      if (!isNaN(tgl.getTime()) && tgl >= today) {
        pendapatanHari += Number(txRows[i][3]) || 0;
        transaksiHari++;
      }
    }
  }

  var totalProduk = 0;
  var pSheet = ss.getSheetByName("products");
  if (pSheet) totalProduk = Math.max(0, pSheet.getLastRow() - 1);

  var stokHabis = 0;
  var stokSheet = ss.getSheetByName("stok");
  if (stokSheet) {
    var sr = stokSheet.getDataRange().getValues();
    for (var i = 1; i < sr.length; i++) if ((Number(sr[i][3]) || 0) === 0) stokHabis++;
  }

  var totalCabang = 0;
  var cabSheet = ss.getSheetByName("cabang");
  if (cabSheet) totalCabang = Math.max(0, cabSheet.getLastRow() - 1);

  var totalStaff = 0;
  var stafSheet = ss.getSheetByName("staff");
  if (stafSheet) totalStaff = Math.max(0, stafSheet.getLastRow() - 1);

  return {
    status: "success",
    data: {
      pendapatan_hari: pendapatanHari,
      transaksi_hari:  transaksiHari,
      total_produk:    totalProduk,
      stok_habis:      stokHabis,
      total_cabang:    totalCabang,
      total_staff:     totalStaff
    }
  };
}


// ===================================
//  LAPORAN & EXPORT
// ===================================
function getLaporan(data) {
  var tenantId = data.tenant_id;
  var tz       = Session.getScriptTimeZone();
  var ss       = getTenantSS(tenantId);

  // Parse tanggal dari client (format YYYY-MM-DD)
  function parseDate(str, endOfDay) {
    var p = str.split("-");
    var d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    if (endOfDay) d.setHours(23, 59, 59, 999);
    return d;
  }
  var dari           = data.dari   ? parseDate(data.dari,   false) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  var sampai         = data.sampai ? parseDate(data.sampai, true)  : new Date();
  var filterCabangId = data.cabang_id ? String(data.cabang_id) : "";

  // Cabang map
  var cabangMap = {};
  var cabSheet  = ss.getSheetByName("cabang");
  if (cabSheet) {
    var cRows = cabSheet.getDataRange().getValues();
    for (var i = 1; i < cRows.length; i++) {
      if (cRows[i][0]) cabangMap[String(cRows[i][0])] = String(cRows[i][1]);
    }
  }

  // Items map: transaction_id -> [{nama, harga, qty}]
  var itemsByTx = {};
  var tiSheet   = ss.getSheetByName("transaction_items");
  if (tiSheet) {
    var tiRows = tiSheet.getDataRange().getValues();
    for (var i = 1; i < tiRows.length; i++) {
      var txId = String(tiRows[i][1]);
      if (!itemsByTx[txId]) itemsByTx[txId] = [];
      itemsByTx[txId].push({
        nama:  String(tiRows[i][3]),
        harga: Number(tiRows[i][4]) || 0,
        qty:   Number(tiRows[i][5]) || 0
      });
    }
  }

  var txSheet = ss.getSheetByName("transactions");
  if (!txSheet) return { status: "success", data: { transaksi: [], summary: {}, per_metode: {}, per_jam: {} } };

  var rows            = txSheet.getDataRange().getValues();
  var transaksi       = [];
  var totalPendapatan = 0, totalTransaksi = 0;
  var perMetode       = {};
  var perJam          = {};

  for (var i = 1; i < rows.length; i++) {
    var row   = rows[i];
    if (!row[0]) continue;
    var tgl   = new Date(row[2]);
    if (isNaN(tgl.getTime()) || tgl < dari || tgl > sampai) continue;

    var total  = Number(row[3]) || 0;
    var metode = String(row[5] || "tunai").toLowerCase().trim();
    var cabId  = String(row[1] || "");
    var txId   = String(row[0]);

    if (filterCabangId && cabId !== filterCabangId) continue;

    totalPendapatan += total;
    totalTransaksi++;
    perMetode[metode] = (perMetode[metode] || 0) + total;

    var jam = tgl.getHours();
    if (!perJam[jam]) perJam[jam] = { transaksi: 0, total: 0 };
    perJam[jam].transaksi++;
    perJam[jam].total += total;

    transaksi.push({
      id:          txId,
      cabang_nama: cabangMap[cabId] || "-",
      tanggal:     Utilities.formatDate(tgl, tz, "dd/MM/yyyy HH:mm"),
      total:       total,
      diskon:      Number(row[4]) || 0,
      metode_bayar: metode,
      kasir:       String(row[6] || ""),
      items:       itemsByTx[txId] || []
    });
  }

  transaksi.sort(function(a, b) { return b.tanggal > a.tanggal ? 1 : -1; });

  // Top metode
  var topMetode = Object.keys(perMetode).sort(function(a, b) { return perMetode[b] - perMetode[a]; })[0] || "-";

  return {
    status: "success",
    data: {
      summary: {
        pendapatan:  totalPendapatan,
        transaksi:   totalTransaksi,
        avg:         totalTransaksi > 0 ? Math.round(totalPendapatan / totalTransaksi) : 0,
        top_metode:  topMetode
      },
      per_metode: perMetode,
      per_jam:    perJam,
      transaksi:  transaksi
    }
  };
}


// ===================================
//  STOK PER PRODUK (untuk assign di katalog)
// ===================================
function getStokProduk(data) {
  var tenantId  = data.tenant_id;
  var productId = String(data.product_id || "");
  var ss        = getTenantSS(tenantId);

  var cabangSheet = ss.getSheetByName("cabang");
  if (!cabangSheet) return { status: "success", data: [] };

  // Build stok map: cabang_id -> qty untuk product ini
  var stokMap   = {};
  var stokSheet = ss.getSheetByName("stok");
  if (stokSheet) {
    var sRows = stokSheet.getDataRange().getValues();
    for (var i = 1; i < sRows.length; i++) {
      if (String(sRows[i][1]) === productId) {
        stokMap[String(sRows[i][2])] = Number(sRows[i][3]) || 0;
      }
    }
  }

  var cRows  = cabangSheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < cRows.length; i++) {
    if (!cRows[i][0]) continue;
    var cabId = String(cRows[i][0]);
    result.push({
      cabang_id:   cabId,
      cabang_nama: String(cRows[i][1]),
      qty:         stokMap[cabId] !== undefined ? stokMap[cabId] : null
    });
  }
  return { status: "success", data: result };
}


// ===================================
//  ANALITIK — Sales Analytics Dashboard
// ===================================
function getAnalitik(data) {
  var tenantId = data.tenant_id;
  var periode  = data.periode || "today";
  var ss       = getTenantSS(tenantId);
  var tz       = Session.getScriptTimeZone();

  // ---- Date range ----
  var now      = new Date();
  var daysBack = 1;
  var start    = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (periode === "week") {
    start    = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    daysBack = 7;
  } else if (periode === "month") {
    start    = new Date(now.getFullYear(), now.getMonth(), 1);
    daysBack = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }
  start.setHours(0, 0, 0, 0);

  // ---- Product harga_modal map: product_id -> harga_modal ----
  var modalMap = {};
  var pSheet   = ss.getSheetByName("products");
  if (pSheet) {
    var pRows = pSheet.getDataRange().getValues();
    for (var i = 1; i < pRows.length; i++) {
      if (pRows[i][0]) modalMap[String(pRows[i][0])] = Number(pRows[i][3]) || 0;
    }
  }

  // ---- Cabang name map ----
  var cabangNameMap = {};
  var cabSheet = ss.getSheetByName("cabang");
  if (cabSheet) {
    var cRows = cabSheet.getDataRange().getValues();
    for (var i = 1; i < cRows.length; i++) {
      if (cRows[i][0]) cabangNameMap[String(cRows[i][0])] = String(cRows[i][1]);
    }
  }

  // ---- Build items map: transaction_id -> items[] ----
  var itemsByTx = {};
  var tiSheet   = ss.getSheetByName("transaction_items");
  if (tiSheet) {
    var tiRows = tiSheet.getDataRange().getValues();
    for (var i = 1; i < tiRows.length; i++) {
      var r    = tiRows[i];
      var txId = String(r[1]);
      if (!itemsByTx[txId]) itemsByTx[txId] = [];
      itemsByTx[txId].push({ product_id: String(r[2]), nama: String(r[3]), harga: Number(r[4]) || 0, qty: Number(r[5]) || 0 });
    }
  }

  // ---- Aggregate transactions ----
  var totalPendapatan = 0, totalKeuntungan = 0, totalTransaksi = 0;
  var cabangAgg = {}, produkAgg = {}, trendAgg = {};

  var txSheet = ss.getSheetByName("transactions");
  if (txSheet) {
    var txRows = txSheet.getDataRange().getValues();
    for (var i = 1; i < txRows.length; i++) {
      var row   = txRows[i];
      var txId  = String(row[0]);
      var cabId = String(row[1]);
      var tgl   = new Date(row[2]);
      var total = Number(row[3]) || 0;

      if (!txId || isNaN(tgl.getTime()) || tgl < start) continue;

      // Keuntungan dari items
      var items = itemsByTx[txId] || [];
      var laba  = 0;
      for (var j = 0; j < items.length; j++) {
        var it    = items[j];
        var modal = modalMap[it.product_id] || 0;
        // harga_modal=0 → seluruh harga jual dianggap keuntungan
        laba += modal > 0 ? (it.harga - modal) * it.qty : it.harga * it.qty;

        var pKey = it.product_id;
        if (!produkAgg[pKey]) produkAgg[pKey] = { nama: it.nama, qty: 0, pendapatan: 0 };
        produkAgg[pKey].qty        += it.qty;
        produkAgg[pKey].pendapatan += it.harga * it.qty;
      }

      totalPendapatan += total;
      totalKeuntungan += laba;
      totalTransaksi++;

      if (!cabangAgg[cabId]) {
        cabangAgg[cabId] = { id: cabId, nama: cabangNameMap[cabId] || "Cabang", pendapatan: 0, keuntungan: 0, transaksi: 0 };
      }
      cabangAgg[cabId].pendapatan += total;
      cabangAgg[cabId].keuntungan += laba;
      cabangAgg[cabId].transaksi++;

      var tglKey = Utilities.formatDate(tgl, tz, "dd/MM");
      if (!trendAgg[tglKey]) trendAgg[tglKey] = { tanggal: tglKey, pendapatan: 0, keuntungan: 0 };
      trendAgg[tglKey].pendapatan += total;
      trendAgg[tglKey].keuntungan += laba;
    }
  }

  // ---- Trend array: isi semua hari dalam range ----
  var trendArr = [];
  for (var d = daysBack - 1; d >= 0; d--) {
    var dd  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    var key = Utilities.formatDate(dd, tz, "dd/MM");
    trendArr.push(trendAgg[key] || { tanggal: key, pendapatan: 0, keuntungan: 0 });
  }

  // ---- Per-cabang array (sorted by pendapatan desc) ----
  var cabangArr = Object.keys(cabangAgg).map(function(k) { return cabangAgg[k]; });
  cabangArr.sort(function(a, b) { return b.pendapatan - a.pendapatan; });
  cabangArr.forEach(function(c) {
    c.margin = c.pendapatan > 0 ? Math.round(c.keuntungan / c.pendapatan * 100) : 0;
  });

  // ---- Top 5 produk (by qty) ----
  var topProduk = Object.keys(produkAgg).map(function(k) { return produkAgg[k]; });
  topProduk.sort(function(a, b) { return b.qty - a.qty; });
  topProduk = topProduk.slice(0, 5);

  return {
    status: "success",
    data: {
      ringkasan: {
        pendapatan:  totalPendapatan,
        keuntungan:  totalKeuntungan,
        transaksi:   totalTransaksi,
        margin:      totalPendapatan > 0 ? Math.round(totalKeuntungan / totalPendapatan * 100) : 0
      },
      trend:      trendArr,
      per_cabang: cabangArr,
      top_produk: topProduk
    }
  };
}
