const SUPABASE_URL = "https://zoicubzrvdaypqznhxic.supabase.co";
const SUPABASE_KEY = "sb_publishable_nw3XMIh08KNyrzaCy8xZTg_n0Xgomvy";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);

let items = [];
let recipes = [];
let currentUser = null;
let oddMode = false;

const oddMenus = [
  { title: "{a}{b}ทอดกรอบ", tip: "ชุบแป้งทอดให้กรอบ จิ้มซอสพริก" },
  { title: "ซุปครีม{a}และ{b}", tip: "ปั่นให้เนียน ราดน้ำมันพริกเล็กน้อย" },
  { title: "ยำ{a}{b}รสเปรี้ยวเผ็ด", tip: "คลุกน้ำยำมะนาวพริก โรยถั่วคั่ว" },
  { title: "{a}อบชีส กับ{b}", tip: "อบในเตาหรือหม้อทอดไร้น้ำมันจนชีสเหลือง" },
  { title: "แซนด์วิช{a}{b}", tip: "ทาเนยบนขนมปัง ย่างให้กรอบทั้งสองด้าน" }
];

function setMsg(el, text, isError) {
  el.textContent = text;
  el.className = isError ? "msg error" : "msg";
}

function inDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function usable(it) {
  const left = daysLeft(it.expiry_date);
  return left === null || left >= 0;
}

// TODO (ฝั่งหลังบ้าน): ส่งไฟล์รูปไปให้ AI อ่าน แล้วคืนรายชื่อวัตถุดิบ
// ตัวอย่างค่าที่คืน: ["ไข่", "ต้นหอม"]
async function detectIngredients(file) {
  return [];
}

// ---------- ล็อกอิน ----------
async function handleSession(session) {
  currentUser = session ? session.user : null;
  $("authBox").style.display = currentUser ? "none" : "block";
  $("app").style.display = currentUser ? "block" : "none";
  $("userbar").style.display = currentUser ? "flex" : "none";
  if (currentUser) {
    $("userEmail").textContent = currentUser.email;
    await Promise.all([loadItems(), loadRecipes()]);
  } else {
    items = [];
  }
}

db.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
    setTimeout(() => handleSession(session), 0);
  }
});
db.auth.getSession().then(({ data }) => handleSession(data.session));

$("loginBtn").onclick = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) { setMsg($("authMsg"), "กรุณากรอกอีเมลและรหัสผ่าน", true); return; }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) setMsg($("authMsg"), "เข้าสู่ระบบไม่สำเร็จ: " + error.message, true);
};

$("signupBtn").onclick = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) { setMsg($("authMsg"), "กรุณากรอกอีเมลและรหัสผ่าน", true); return; }
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { setMsg($("authMsg"), "สมัครไม่สำเร็จ: " + error.message, true); return; }
  if (!data.session) setMsg($("authMsg"), "สมัครแล้ว กรุณาตรวจอีเมลเพื่อกดยืนยัน แล้วกลับมาเข้าสู่ระบบ");
};

$("logoutBtn").onclick = () => db.auth.signOut();

// ---------- โหลดข้อมูล ----------
async function loadItems() {
  const { data, error } = await db
    .from("fridge_items")
    .select("*")
    .order("expiry_date", { ascending: true });
  if (error) { setMsg($("appMsg"), "โหลดของในตู้เย็นไม่สำเร็จ: " + error.message, true); return; }
  items = data;
  setMsg($("appMsg"), "");
  render();
}

async function loadRecipes() {
  const [r, ing] = await Promise.all([
    db.from("recipes").select("id, title, cuisine, steps"),
    db.from("recipe_ingredients").select("recipe_id, name")
  ]);
  const err = r.error || ing.error;
  if (err) { setMsg($("appMsg"), "โหลดสูตรอาหารไม่สำเร็จ: " + err.message, true); return; }
  const map = {};
  ing.data.forEach(x => { (map[x.recipe_id] = map[x.recipe_id] || []).push(x.name); });
  recipes = r.data.map(x => ({ ...x, ingredients: map[x.id] || [] }));
  render();
}

// ---------- เพิ่ม/ลบของ ----------
async function addItems(list) {
  const rows = list.map(it => ({ user_id: currentUser.id, ...it }));
  const { error } = await db.from("fridge_items").insert(rows);
  if (error) { setMsg($("appMsg"), "บันทึกไม่สำเร็จ: " + error.message, true); return false; }
  await loadItems();
  return true;
}

async function deleteItem(id) {
  const { error } = await db.from("fridge_items").delete().eq("id", id);
  if (error) { setMsg($("appMsg"), "ลบไม่สำเร็จ: " + error.message, true); return; }
  await loadItems();
}

$("add").onclick = async () => {
  const name = $("name").value.trim();
  const exp = $("exp").value;
  if (!name || !exp) { setMsg($("appMsg"), "กรุณากรอกชื่อและวันหมดอายุ", true); return; }
  const qty = parseFloat($("qty").value) || 1;
  const unit = $("unit").value.trim() || "ชิ้น";
  const ok = await addItems([{ name, qty, unit, expiry_date: exp }]);
  if (ok) {
    $("name").value = "";
    $("qty").value = "";
    $("unit").value = "";
  }
};

// ---------- แสดงผล ----------
function renderList() {
  const list = $("list");
  list.innerHTML = "";
  if (items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "ตู้เย็นยังว่างอยู่ ลองเพิ่มของด้านบนดูครับ";
    list.appendChild(li);
    return;
  }
  items.forEach(it => {
    const left = daysLeft(it.expiry_date);
    const li = document.createElement("li");
    const nameEl = document.createElement("span");
    nameEl.className = "itemname";
    nameEl.textContent = it.name + " (" + Number(it.qty) + " " + (it.unit || "") + ")";
    const when = document.createElement("span");
    if (left === null) {
      when.textContent = "ไม่ระบุวัน";
    } else {
      when.textContent = left < 0 ? "หมดอายุแล้ว" : "อีก " + left + " วัน";
      if (left <= 3) when.className = "soon";
    }
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "ลบ";
    del.onclick = () => deleteItem(it.id);
    li.append(nameEl, when, del);
    list.appendChild(li);
  });
}

function renderRecipes() {
  const box = $("recipes");
  box.innerHTML = "";
  if (recipes.length === 0) {
    box.textContent = "กำลังโหลดสูตรอาหาร...";
    return;
  }
  const fresh = items.filter(usable);

  const scored = recipes.map(r => {
    let score = 0, urgent = false;
    const have = [], miss = [];
    r.ingredients.forEach(ing => {
      const hit = fresh.find(it => it.name.includes(ing) || ing.includes(it.name));
      if (hit) {
        have.push(ing);
        score += 1;
        const left = daysLeft(hit.expiry_date);
        if (left !== null && left <= 3) { score += 2; urgent = true; }
      } else {
        miss.push(ing);
      }
    });
    return { r, score, urgent, have, miss };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);

  if (scored.length === 0) {
    box.textContent = "ยังไม่มีเมนูที่ตรงกับของในตู้เย็น ลองเพิ่มวัตถุดิบดูครับ";
    return;
  }

  scored.forEach(x => {
    const div = document.createElement("div");
    div.className = "card";
    const h = document.createElement("h3");
    h.textContent = x.r.title;
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.textContent = x.r.cuisine || "";
    const have = document.createElement("div");
    have.className = "have";
    have.textContent = "มีแล้ว: " + x.have.join(", ");
    const miss = document.createElement("div");
    miss.className = "miss";
    miss.textContent = x.miss.length ? "ยังขาด: " + x.miss.join(", ") : "ครบทุกอย่าง";
    div.append(h, tag);
    if (x.urgent) {
      const u = document.createElement("span");
      u.className = "urgent";
      u.textContent = "ใช้ของใกล้หมดอายุ";
      div.append(u);
    }
    div.append(have, miss);
    if (x.r.steps) {
      const det = document.createElement("details");
      const sum = document.createElement("summary");
      sum.textContent = "วิธีทำ";
      const st = document.createElement("div");
      st.className = "steps";
      st.textContent = x.r.steps.replace(/\s*(\d+\.)/g, "\n$1").trim();
      det.append(sum, st);
      div.append(det);
    }
    box.appendChild(div);
  });
}

function renderOdd() {
  const box = $("odd");
  box.innerHTML = "";
  const fresh = items
    .filter(usable)
    .sort((a, b) => (daysLeft(a.expiry_date) ?? 9999) - (daysLeft(b.expiry_date) ?? 9999));

  if (fresh.length < 2) {
    box.textContent = "ต้องมีวัตถุดิบอย่างน้อย 2 อย่างในตู้เย็นก่อนครับ";
    return;
  }

  const a = fresh[0];
  const others = fresh.slice(1);
  const b = others[Math.floor(Math.random() * others.length)];
  const m = oddMenus[Math.floor(Math.random() * oddMenus.length)];

  const div = document.createElement("div");
  div.className = "card odd";
  const pair = document.createElement("div");
  pair.className = "pair";
  pair.textContent = a.name + " + " + b.name;
  const h = document.createElement("h3");
  h.textContent = m.title.replace("{a}", a.name).replace("{b}", b.name);
  const tip = document.createElement("div");
  tip.textContent = m.tip;
  div.append(pair, h, tip);
  const left = daysLeft(a.expiry_date);
  if (left !== null && left <= 3) {
    const u = document.createElement("span");
    u.className = "urgent";
    u.textContent = a.name + " ใกล้หมดอายุ ควรใช้ก่อน";
    div.append(u);
  }
  box.appendChild(div);
}

function render() {
  renderList();
  renderRecipes();
  renderOdd();
}

$("modeBtn").onclick = () => {
  oddMode = !oddMode;
  const btn = $("modeBtn");
  btn.textContent = "โหมดจับคู่แปลกๆ: " + (oddMode ? "เปิด" : "ปิด");
  btn.className = oddMode ? "on" : "secondary";
  $("recipes").style.display = oddMode ? "none" : "block";
  $("odd").style.display = oddMode ? "block" : "none";
  $("shuffleBtn").style.display = oddMode ? "inline-block" : "none";
};

$("shuffleBtn").onclick = renderOdd;

// ---------- เพิ่มจากรูปถ่าย ----------
const photoInput = $("photo");
const preview = $("preview");

photoInput.onchange = async () => {
  const file = photoInput.files[0];
  if (!file) return;
  if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.dataset.url = url;
  preview.style.display = "block";
  $("photoForm").style.display = "block";
  $("photoExp").value = inDays(5);

  const names = await detectIngredients(file);
  $("photoNames").value = names.join(", ");
  $("photoNote").textContent = names.length
    ? "อ่านจากรูปได้ตามนี้ แก้ไขได้ก่อนกดเพิ่ม"
    : "ยังไม่ได้เชื่อมการอ่านรูปด้วย AI กรุณาพิมพ์ชื่อวัตถุดิบที่เห็นในรูปเอง";
};

$("photoAdd").onclick = async () => {
  const exp = $("photoExp").value;
  const names = $("photoNames").value.split(",").map(s => s.trim()).filter(Boolean);
  if (!names.length || !exp) return;
  const ok = await addItems(names.map(n => ({ name: n, qty: 1, unit: "ชิ้น", expiry_date: exp })));
  if (ok) {
    $("photoNames").value = "";
    $("photoForm").style.display = "none";
    preview.style.display = "none";
    photoInput.value = "";
  }
};

render();
