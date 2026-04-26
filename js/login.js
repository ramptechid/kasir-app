// ================= DEVICE ID =================
let device_id = localStorage.getItem("device_id");
if (!device_id) {
  device_id = "dev-" + Math.random().toString(36).substr(2, 9);
  localStorage.setItem("device_id", device_id);
}


// ================= LOGIN =================
async function login() {
  const btn      = document.getElementById("loginBtn");
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) { showToast("Email dan password wajib diisi!", "warning"); return; }

  btn.disabled  = true;
  btn.innerHTML = '<div class="loader"></div>';

  try {
    const res  = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action:"login", email, password, device_id })
    });
    const data = await res.json();

    if (data.status === "success") {
      localStorage.setItem("is_login",    "true");
      localStorage.setItem("tenant_id",   data.tenant_id);
      localStorage.setItem("nama_bisnis", data.nama_bisnis);
      localStorage.setItem("role",        data.role);
      localStorage.setItem("cabang_id",   data.cabang_id   || "");
      localStorage.setItem("cabang_nama", data.cabang_nama || "");
      localStorage.setItem("staff_id",    data.staff_id    || "");
      localStorage.setItem("staff_nama",  data.staff_nama  || "");

      // Owner → dashboard, Staff → langsung kasir
      setTimeout(function() {
        window.location.href = data.role === "owner"
          ? "/kasir-app/dashboard"
          : "/kasir-app/kasir";
      }, 300);
    } else {
      showToast(data.message || "Login gagal", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("Gagal koneksi ke server", "error");
  }

  btn.disabled  = false;
  btn.innerHTML = "Login";
}
