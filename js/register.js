// ================= REGISTER FUNCTION =================
async function register() {
  const btn = document.getElementById("registerBtn");

  const nama = document.getElementById("nama").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  // VALIDASI
  if (!nama || !email || !password) {
    showToast("Semua field wajib diisi!", "warning");
    return;
  }

  if (password.length < 4) {
    showToast("Password minimal 4 karakter!", "warning");
    return;
  }

  // 🔥 START LOADING
  btn.disabled = true;
  btn.innerHTML = '<div class="loader"></div>';

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "register",
        nama_bisnis: nama,
        email: email,
        password: password
      })
    });

    const data = await res.json();

    if (data.status === "success") {
      showToast("Registrasi berhasil! Mengalihkan ke login...", "success");
      setTimeout(function() { window.location.href = "login.html"; }, 2000);
    } else {
      showToast(data.message || "Registrasi gagal", "error");
    }

  } catch (err) {
    console.error(err);
    showToast("Gagal koneksi ke server", "error");
  }

  // 🔥 STOP LOADING
  btn.disabled = false;
  btn.innerHTML = "Daftar";
}