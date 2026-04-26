const API_URL = "ISI_URL_LO";

async function loadProduk() {
  const tenant_id = localStorage.getItem("tenant_id");

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "getCatalog",
      tenant_id
    })
  });

  const data = await res.json();

  const select = document.getElementById("produkSelect");
  select.innerHTML = "";

  data.data.forEach(d => {
    select.innerHTML += `<option value="${d.id}">${d.nama}</option>`;
  });
}

async function addProduk() {
  const tenant_id = localStorage.getItem("tenant_id");

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "addProduct",
      tenant_id,
      id: document.getElementById("produkSelect").value,
      harga: document.getElementById("harga").value,
      stok: document.getElementById("stok").value
    })
  });

  showToast("Berhasil tambah stok", "success");
}

loadProduk();