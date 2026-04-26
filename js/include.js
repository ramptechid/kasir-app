function loadComponent(id, file) {
  const target = document.getElementById(id);

  if (!target) {
    console.error("Element tidak ditemukan:", id);
    return;
  }

  fetch(file)
    .then(res => {
      if (!res.ok) {
        throw new Error("Gagal load file: " + file);
      }
      return res.text();
    })
    .then(data => {
      target.innerHTML = data;

      // 🔥 Auto year
      const year = new Date().getFullYear();
      const el = document.getElementById("year");
      if (el) el.innerText = year;
    })
    .catch(err => {
      console.error("ERROR LOAD COMPONENT:", err);
      target.innerHTML = "<p style='color:red'>Footer gagal dimuat</p>";
    });
}