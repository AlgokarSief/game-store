const S = window.STORE, sb = supabase.createClient(S.supabaseUrl, S.supabaseKey);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; setTimeout(() => e.hidden = true, 2000); }
async function init() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { $("login").hidden = false; $("panel").hidden = true; return; }
  const { data: ok } = await sb.rpc("is_admin");
  $("login").hidden = true; $("deny").hidden = !!ok; $("panel").hidden = !ok;
  if (ok) { loadProducts(); loadOrders(); } else $("login").hidden = false;
}
$("go").onclick = async () => { const r = await sb.auth.signInWithPassword({ email: $("e").value.trim(), password: $("p").value }); if (r.error) $("err").textContent = r.error.message; else init(); };
async function upload(file) {
  if (!file) return null;
  const path = Date.now() + "-" + file.name.replace(/[^\w.-]/g, "_");
  const { error } = await sb.storage.from("product-images").upload(path, file);
  if (error) { toast("فشل رفع الصورة"); return null; }
  return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}
$("add").onclick = async () => {
  const name = $("nn").value.trim(), price = parseFloat($("np").value);
  if (!name || isNaN(price)) return toast("اكتب الاسم والسعر");
  const image_url = await upload($("nf").files[0]);
  const { error } = await sb.from("products").insert({ name, price, category: $("nc").value.trim() || null, description: $("nd").value.trim() || null, image_url });
  if (error) return toast("خطأ: " + error.message);
  ["nn", "np", "nc", "nd", "nf"].forEach(i => $(i).value = ""); toast("اتضاف"); loadProducts();
};
async function loadProducts() {
  const { data } = await sb.from("products").select("*").order("created_at");
  $("pt").innerHTML = "<tr><th>الاسم</th><th>السعر</th><th>القسم</th><th>متاح</th><th>صورة</th><th></th></tr>" + data.map(p => `<tr data-id="${p.id}"><td><input data-f="name" value="${esc(p.name)}"></td><td><input data-f="price" type="number" value="${p.price}"></td><td><input data-f="category" value="${esc(p.category)}"></td><td><input data-f="in_stock" type="checkbox" ${p.in_stock ? "checked" : ""}></td><td><input data-f="img" type="file" accept="image/*"></td><td><button class="btn sm" data-save>حفظ</button> <button class="pill" data-del>حذف</button></td></tr>`).join("");
  $("pt").querySelectorAll("tr[data-id]").forEach(tr => {
    const id = tr.dataset.id, g = f => tr.querySelector(`[data-f=${f}]`);
    tr.querySelector("[data-save]").onclick = async () => {
      const upd = { name: g("name").value.trim(), price: parseFloat(g("price").value), category: g("category").value.trim() || null, in_stock: g("in_stock").checked };
      const url = await upload(g("img").files[0]); if (url) upd.image_url = url;
      const { error } = await sb.from("products").update(upd).eq("id", id); toast(error ? "خطأ: " + error.message : "اتحفظ");
    };
    tr.querySelector("[data-del]").onclick = async () => { if (!confirm("تحذف المنتج؟")) return; await sb.from("products").delete().eq("id", id); loadProducts(); };
  });
}
async function loadOrders() {
  const { data } = await sb.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  const st = { new: "جديد", paid: "مدفوع", delivered: "اتسلم", cancelled: "ملغي" };
  $("ot").innerHTML = "<tr><th>التاريخ</th><th>الاسم</th><th>الموبايل</th><th>الطلب</th><th>الإجمالي</th><th>الحالة</th></tr>" + data.map(o => `<tr><td>${new Date(o.created_at).toLocaleString("ar-EG")}</td><td>${esc(o.customer_name)}</td><td>${esc(o.phone)}</td><td>${o.items.map(i => esc(i.name) + " ×" + i.qty).join("<br>")}</td><td>${o.total}</td><td><select data-o="${o.id}">${Object.entries(st).map(([k, v]) => `<option value="${k}" ${o.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></td></tr>`).join("");
  $("ot").querySelectorAll("[data-o]").forEach(s => s.onchange = async () => { const { error } = await sb.from("orders").update({ status: s.value }).eq("id", s.dataset.o); toast(error ? "خطأ" : "اتحدث"); });
}
init();
