// ข้อมูลจำลอง: ภายหลังเปลี่ยนเป็นดึงจากหลังบ้าน
function inDays(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
let items = [
  { name: "นม", quantity: "1 กล่อง", expiry_date: inDays(2) },
  { name: "ไข่", quantity: "4 ฟอง", expiry_date: inDays(10) },
  { name: "ต้นหอม", quantity: "1 กำ", expiry_date: inDays(1) }
];
const recipes = [
  { title: "ไข่เจียวต้นหอม", cuisine: "ไทย", ingredients: ["ไข่", "ต้นหอม"] },
  { title: "ข้าวผัดไข่", cuisine: "ไทย", ingredients: ["ข้าว", "ไข่", "ต้นหอม"] },
  { title: "พุดดิ้งนม", cuisine: "ขนม", ingredients: ["นม", "ไข่", "น้ำตาล"] },
  { title: "ฟักทองผัดไข่", cuisine: "ไทย", ingredients: ["ฟักทอง", "ไข่"] },
  { title: "ผัดผักรวม", cuisine: "จีน", ingredients: ["กะหล่ำปลี", "แครอท", "กระเทียม"] }
];
const oddMenus = [
  { title: "{a}{b}ทอดกรอบ", tip: "ชุบแป้งทอดให้กรอบ จิ้มซอสพริก" },
  { title: "ซุปครีม{a}และ{b}", tip: "ปั่นให้เนียน ราดน้ำมันพริกเล็กน้อย" },
  { title: "ยำ{a}{b}รสเปรี้ยวเผ็ด", tip: "คลุกน้ำยำมะนาวพริก โรยถั่วคั่ว" },
  { title: "{a}อบชีส กับ{b}", tip: "อบในเตาหรือหม้อทอดไร้น้ำมันจนชีสเหลือง" },
  { title: "แซนด์วิช{a}{b}", tip: "ทาเนยบนขนมปัง ย่างให้กรอบทั้งสองด้าน" }
];

let oddMode = false;

// TODO (ฝั่งหลังบ้าน): ส่งไฟล์รูปไปให้ AI อ่าน แล้วคืนรายชื่อวัตถุดิบ
// ตัวอย่างค่าที่คืน: ["ไข่", "ต้นหอม"]
async function detectIngredients(file) {
  return [];
}

function daysLeft(d) {
  return Math.ceil((new Date(d) - new Date()) / 86400000);
}

function renderList() {
  const list = document.getElementById("list");
  list.innerHTML = "";
  items
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .forEach(it => {
      const left = daysLeft(it.expiry_date);
      const li = document.createElement("li");
      const label = left < 0 ? "หมดอายุแล้ว" : "อีก " + left + " วัน";
      li.innerHTML = "<span></span><span class='" + (left <= 3 ? "soon" : "") + "'>" + label + "</span>";
      li.firstChild.textContent = it.name + " (" + (it.quantity || "-") + ")";
      list.appendChild(li);
    });
}

function renderRecipes() {
  const box = document.getElementById("recipes");
  box.innerHTML = "";
  const fresh = items.filter(it => daysLeft(it.expiry_date) >= 0);

  const scored = recipes.map(r => {
    let score = 0, urgent = false;
    const have = [], miss = [];
    r.ingredients.forEach(ing => {
      const hit = fresh.find(it => it.name.includes(ing) || ing.includes(it.name));
      if (hit) {
        have.push(ing);
        score += 1;
        if (daysLeft(hit.expiry_date) <= 3) { score += 2; urgent = true; }
      } else {
        miss.push(ing);
      }
    });
    return { r, score, urgent, have, miss };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

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
    tag.textContent = x.r.cuisine;
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
    box.appendChild(div);
  });
}

function renderOdd() {
  const box = document.getElementById("odd");
  box.innerHTML = "";
  const fresh = items
    .filter(it => daysLeft(it.expiry_date) >= 0)
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

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
  const u = document.createElement("span");
  u.className = "urgent";
  u.textContent = a.name + " ใกล้หมดอายุ ควรใช้ก่อน";
  div.append(pair, h, tip);
  if (daysLeft(a.expiry_date) <= 3) div.append(u);
  box.appendChild(div);
}

function render() {
  renderList();
  renderRecipes();
  renderOdd();
}

document.getElementById("modeBtn").onclick = () => {
  oddMode = !oddMode;
  const btn = document.getElementById("modeBtn");
  btn.textContent = "โหมดจับคู่แปลกๆ: " + (oddMode ? "เปิด" : "ปิด");
  btn.className = oddMode ? "on" : "secondary";
  document.getElementById("recipes").style.display = oddMode ? "none" : "block";
  document.getElementById("odd").style.display = oddMode ? "block" : "none";
  document.getElementById("shuffleBtn").style.display = oddMode ? "inline-block" : "none";
};

document.getElementById("shuffleBtn").onclick = renderOdd;

document.getElementById("add").onclick = () => {
  const name = document.getElementById("name").value.trim();
  const exp = document.getElementById("exp").value;
  if (!name || !exp) return;
  items.push({ name, quantity: document.getElementById("qty").value, expiry_date: exp });
  document.getElementById("name").value = "";
  document.getElementById("qty").value = "";
  render();
};

// ----- เพิ่มจากรูปถ่าย -----
const photoInput = document.getElementById("photo");
const preview = document.getElementById("preview");

photoInput.onchange = async () => {
  const file = photoInput.files[0];
  if (!file) return;
  if (preview.dataset.url) URL.revokeObjectURL(preview.dataset.url);
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.dataset.url = url;
  preview.style.display = "block";
  document.getElementById("photoForm").style.display = "block";
  document.getElementById("photoExp").value = inDays(5);

  const names = await detectIngredients(file);
  document.getElementById("photoNames").value = names.join(", ");
  document.getElementById("photoNote").textContent = names.length
    ? "อ่านจากรูปได้ตามนี้ แก้ไขได้ก่อนกดเพิ่ม"
    : "ยังไม่ได้เชื่อมการอ่านรูปด้วย AI กรุณาพิมพ์ชื่อวัตถุดิบที่เห็นในรูปเอง";
};

document.getElementById("photoAdd").onclick = () => {
  const exp = document.getElementById("photoExp").value;
  const names = document.getElementById("photoNames").value
    .split(",").map(s => s.trim()).filter(Boolean);
  if (!names.length || !exp) return;
  names.forEach(n => items.push({ name: n, quantity: "", expiry_date: exp }));
  document.getElementById("photoNames").value = "";
  document.getElementById("photoForm").style.display = "none";
  preview.style.display = "none";
  photoInput.value = "";
  render();
};

render();
