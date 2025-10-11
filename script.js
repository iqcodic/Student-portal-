// script.js — regenerated for your Supabase project (drop-in replacement)
// Must include supabase UMD, html2canvas and jspdf before this file.

(() => {
  // ---------- CONFIG (your project) ----------
  const SUPABASE_URL = "https://rufljtftrrdpjhfhkwir.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmxqdGZ0cnJkcGpoZmhrd2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjE5NjcsImV4cCI6MjA3NTczNzk2N30.0W70Dt4P4blJMMwU1rYeEjTbW4uO_dXyOtgPUbwRPsc";
  const BUCKET = "students";
  const TABLE = "students";

  const { createClient } = window.supabase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ---------- UTILS ----------
  const q = (idList) => {
    // idList: string or array of strings; returns first existing element
    if (!Array.isArray(idList)) idList = [idList];
    for (const id of idList) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  };

  const log = (...args) => console.log("[SPORTAL]", ...args);
  const warn = (...args) => console.warn("[SPORTAL]", ...args);
  const errLog = (...args) => console.error("[SPORTAL]", ...args);

  function showMessage(msg) {
    // small user alert and console
    alert(msg);
    log(msg);
  }

  function escapeHtml(s = "") {
    return String(s).replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }

  // ---------- DOM refs (support many id variants) ----------
  const loginForm = q(["login-form", "loginForm", "loginFormId"]);
  const emailInput = q(["email", "adminEmail"]);
  const passwordInput = q(["password", "adminPassword"]);
  const logoutBtn = q(["logout-btn", "logoutBtn", "logoutBtnId"]);

  const adminPanel = q(["admin-panel", "adminPanel"]);
  const addForm = q(["add-student-form", "studentForm", "addForm"]);
  const nameInput = q(["student-name", "name"]);
  const rollInput = q(["student-roll", "roll"]);
  const photoInput = q(["student-photo", "photo"]);
  const classInput = q(["student-class", "class", "cls"]);
  const dobInput = q(["student-dob", "dob"]);
  const admissionInput = q(["student-admission", "admission"]);
  const contactInput = q(["student-contact", "contact"]);
  const addressInput = q(["student-address", "address"]);

  const searchInput = q(["search-input", "searchInput", "query", "q"]);
  const searchResults = q(["search-results", "searchResults", "resultArea", "results"]);
  const studentsTableBody = q(["students-table-body", "studentsTableBody", "students-table", "studentsTableBodyId"]);
  const adminList = q(["adminList", "admin-list", "adminListId"]);

  const modal = q(["modal"]);
  const modalCard = q(["modalCard"]);

  // ---------- sanity checks ----------
  log("script.js loaded, checking DOM elements...");
  if (!loginForm) warn("loginForm not found — authentication will still work if you call signIn manually.");
  if (!addForm) warn("addForm not found — adding/editing may not work.");
  if (!searchInput) warn("searchInput not found — search field unavailable.");
  if (!searchResults) warn("searchResults area not found — search results won't render.");
  if (!studentsTableBody) warn("studentsTableBody not found — table listing won't render.");
  if (!adminPanel) warn("adminPanel not found — admin UI toggling won't happen.");

  // ---------- HELPERS: table/bucket checks ----------
  async function checkTableExists() {
    try {
      // quick safe query
      const { data, error } = await supabase.from(TABLE).select("id").limit(1);
      if (error) {
        warn("table check error:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      warn("table check exception", e);
      return false;
    }
  }

  async function checkBucketExists() {
    try {
      // try list or getPublicUrl of a not-existing file -> but we can list bucket metadata
      const res = await supabase.storage.getBucket(BUCKET);
      // res will be { data: {...} } if exists, or error
      if (res.error) {
        warn("bucket check error:", res.error.message);
        return false;
      }
      return true;
    } catch (e) {
      warn("bucket check exception", e);
      return false;
    }
  }

  // ---------- AUTH ----------
  async function signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        showMessage("Login failed: " + error.message);
        return false;
      }
      log("signed in", data);
      toggleAdmin(true);
      await refreshAll();
      return true;
    } catch (e) {
      errLog("signin exception", e);
      showMessage("Login error: " + (e.message || e));
      return false;
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      toggleAdmin(false);
      showMessage("Signed out");
    } catch (e) {
      errLog("signOut error", e);
    }
  }

  function toggleAdmin(on) {
    if (adminPanel) adminPanel.style.display = on ? "" : "none";
    if (loginForm) loginForm.style.display = on ? "none" : "";
    if (logoutBtn) logoutBtn.style.display = on ? "" : "none";
  }

  // ---------- UPLOAD ----------
  async function uploadPhoto(file) {
    if (!file) return null;
    const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const path = `photos/${safeName}`;
    log("uploading file to", BUCKET, path);
    const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
    if (up.error) {
      warn("upload error", up.error);
      if ((up.error || {}).message && up.error.message.toLowerCase().includes("bucket")) {
        showMessage(`Upload error: bucket not found. Create a public storage bucket named "${BUCKET}" in Supabase storage.`);
      } else {
        showMessage("Upload failed: " + (up.error.message || JSON.stringify(up.error)));
      }
      throw up.error;
    }
    const pub = await supabase.storage.from(BUCKET).getPublicUrl(path);
    if (pub.error) {
      warn("getPublicUrl error", pub.error);
      throw pub.error;
    }
    log("upload public url", pub.data.publicUrl);
    return pub.data.publicUrl;
  }

  // ---------- CRUD ----------
  async function addStudent(payload) {
    try {
      const res = await supabase.from(TABLE).insert([payload]);
      if (res.error) {
        warn("insert error", res.error);
        throw res.error;
      }
      log("student added", res.data);
      return res.data && res.data[0];
    } catch (e) {
      errLog("addStudent error", e);
      showMessage("Add student failed: " + (e.message || e));
      return null;
    }
  }

  async function updateStudent(id, updates) {
    try {
      const res = await supabase.from(TABLE).update(updates).eq("id", id);
      if (res.error) throw res.error;
      log("student updated", res.data);
      return res.data;
    } catch (e) {
      errLog("updateStudent err", e);
      showMessage("Update failed: " + (e.message || e));
      return null;
    }
  }

  async function removeStudent(id) {
    if (!confirm("Delete this student?")) return;
    try {
      const res = await supabase.from(TABLE).delete().eq("id", id);
      if (res.error) throw res.error;
      showMessage("Deleted");
      await refreshAll();
    } catch (e) {
      errLog("delete error", e);
      showMessage("Delete failed: " + (e.message || e));
    }
  }

  // ---------- READ ----------
  async function fetchStudents({ q = null } = {}) {
    try {
      if (q) {
        // search name or roll_number
        const res = await supabase.from(TABLE).select("*").or(`name.ilike.%${q}%,roll_number.ilike.%${q}%`).order("created_at", { ascending: false });
        if (res.error) throw res.error;
        return res.data || [];
      } else {
        const res = await supabase.from(TABLE).select("*").order("created_at", { ascending: false }).limit(1000);
        if (res.error) throw res.error;
        return res.data || [];
      }
    } catch (e) {
      errLog("fetchStudents err", e);
      return [];
    }
  }

  // ---------- RENDER ----------
  async function renderTable() {
    if (!studentsTableBody) return;
    studentsTableBody.innerHTML = "<tr><td colspan='4'>Loading…</td></tr>";
    const rows = await fetchStudents();
    if (!rows.length) {
      studentsTableBody.innerHTML = "<tr><td colspan='4'>No students</td></tr>";
      return;
    }
    studentsTableBody.innerHTML = "";
    rows.forEach((s) => {
      const tr = document.createElement("tr");

      const tdRoll = document.createElement("td");
      tdRoll.textContent = s.roll_number || "";
      tr.appendChild(tdRoll);

      const tdName = document.createElement("td");
      tdName.textContent = s.name || "";
      tr.appendChild(tdName);

      const tdPhoto = document.createElement("td");
      const img = document.createElement("img");
      img.className = "student-photo";
      img.alt = s.name || "photo";
      if (s.photo) img.src = s.photo;
      else img.src = "";
      img.onerror = () => (img.style.display = "none");
      tdPhoto.appendChild(img);
      tr.appendChild(tdPhoto);

      const tdActions = document.createElement("td");
      tdActions.style.display = "flex";
      tdActions.style.gap = "8px";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = () => prefillForm(s);
      tdActions.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.onclick = () => removeStudent(s.id);
      tdActions.appendChild(delBtn);

      const pdfBtn = document.createElement("button");
      pdfBtn.textContent = "PDF";
      pdfBtn.onclick = () => previewPdf(s);
      tdActions.appendChild(pdfBtn);

      tr.appendChild(tdActions);

      studentsTableBody.appendChild(tr);
    });
  }

  async function renderAdminList() {
    if (!adminList) return;
    adminList.innerHTML = "";
    const rows = await fetchStudents();
    rows.forEach((s) => {
      const card = document.createElement("div");
      card.className = "student";
      card.style.display = "flex";
      card.style.gap = "12px";
      card.style.alignItems = "center";
      card.style.padding = "8px";
      card.style.borderRadius = "8px";
      card.style.border = "1px solid #eef2ff";

      const img = document.createElement("img");
      img.style.width = "72px";
      img.style.height = "72px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      if (s.photo) img.src = s.photo;
      else img.src = "";
      img.onerror = () => (img.style.display = "none");

      const info = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.textContent = s.name || "";
      nameEl.style.fontWeight = "700";
      const meta = document.createElement("div");
      meta.textContent = `${s.roll_number || ""} ${s.class ? "• " + s.class : ""}`;
      meta.style.color = "#6b7280";
      info.appendChild(nameEl);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.style.marginLeft = "auto";
      const edit = document.createElement("button");
      edit.textContent = "Edit";
      edit.onclick = () => prefillForm(s);
      const del = document.createElement("button");
      del.textContent = "Delete";
      del.onclick = () => removeStudent(s.id);
      actions.appendChild(edit);
      actions.appendChild(del);

      card.appendChild(img);
      card.appendChild(info);
      card.appendChild(actions);
      adminList.appendChild(card);
    });
  }

  async function renderSearch(qVal) {
    if (!searchResults) return;
    searchResults.innerHTML = "";
    if (!qVal) return;
    searchResults.innerHTML = "<div>Searching…</div>";
    const rows = await fetchStudents({ q: qVal });
    searchResults.innerHTML = "";
    if (!rows.length) {
      searchResults.textContent = "No student found.";
      return;
    }
    rows.forEach((s) => {
      const card = document.createElement("div");
      card.className = "student-card";
      card.style.border = "1px solid #eef2ff";
      card.style.padding = "10px";
      card.style.borderRadius = "8px";
      card.style.marginBottom = "10px";

      const title = document.createElement("div");
      title.style.fontWeight = "700";
      title.textContent = s.name || "";

      const meta = document.createElement("div");
      meta.textContent = `Roll: ${s.roll_number || ""}  Class: ${s.class || ""}`;
      meta.style.color = "#6b7280";
      const openBtn = document.createElement("button");
      openBtn.textContent = "Preview / PDF";
      openBtn.onclick = () => previewPdf(s);

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(openBtn);
      searchResults.appendChild(card);
    });
  }

  // ---------- FORM PREFILL ----------
  let editingId = null;
  function prefillForm(student) {
    editingId = student.id;
    if (nameInput) nameInput.value = student.name || "";
    if (rollInput) rollInput.value = student.roll_number || "";
    if (classInput && student.class) classInput.value = student.class;
    if (dobInput && student.dob) dobInput.value = student.dob;
    if (admissionInput && student.admission_date) admissionInput.value = student.admission_date;
    if (contactInput && student.contact_number) contactInput.value = student.contact_number;
    if (addressInput && student.address) addressInput.value = student.address;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- FORM SUBMIT (add/update) ----------
  if (addForm) {
    addForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const name = nameInput ? nameInput.value.trim() : "";
      const roll = rollInput ? rollInput.value.trim() : "";
      const className = classInput ? classInput.value.trim() : "";
      const dob = dobInput ? dobInput.value : "";
      const admission_date = admissionInput ? admissionInput.value : "";
      const contact_number = contactInput ? contactInput.value.trim() : "";
      const address = addressInput ? addressInput.value.trim() : "";
      const file = photoInput && photoInput.files && photoInput.files[0] ? photoInput.files[0] : null;

      if (!name || !roll) {
        showMessage("Name and Roll are required.");
        return;
      }

      try {
        let photoUrl = null;
        if (file) {
          photoUrl = await uploadPhoto(file);
        }

        if (editingId) {
          const updates = { name, roll_number: roll, class: className, dob, admission_date, contact_number, address };
          if (photoUrl) updates.photo = photoUrl;
          await updateStudent(editingId, updates);
          editingId = null;
          showMessage("Updated");
        } else {
          await addStudent({ name, roll_number: roll, class: className, dob, admission_date, contact_number, address, photo: photoUrl });
          showMessage("Added");
        }
        addForm.reset();
        await refreshAll();
      } catch (e) {
        warn("form submit error", e);
      }
    });
  }

  // ---------- SEARCH HANDLER ----------
  if (searchInput) {
    let t = null;
    searchInput.addEventListener("input", (e) => {
      const v = e.target.value.trim();
      clearTimeout(t);
      t = setTimeout(() => renderSearch(v), 250);
    });
  }

  // ---------- PDF preview & generation ----------
  async function previewPdf(student) {
    try {
      // build node
      const node = document.createElement("div");
      node.style.width = "800px";
      node.style.padding = "20px";
      node.style.background = "#fff";
      node.style.fontFamily = "Inter, Arial, sans-serif";
      // header
      const h = document.createElement("div");
      h.style.display = "flex";
      h.style.justifyContent = "space-between";
      const left = document.createElement("div");
      left.innerHTML = `<div style="font-weight:800;font-size:18px;color:#0b5ed7">SCHOOL NAME</div><div style="color:#6b7280;margin-top:6px">Street Address • Contact</div>`;
      const right = document.createElement("div");
      // try signature
      try {
        const pub = await supabase.storage.from(BUCKET).getPublicUrl("signature/school-sign.png");
        if (pub && pub.data && pub.data.publicUrl) {
          right.innerHTML = `<img src="${pub.data.publicUrl}" style="height:60px;object-fit:contain" alt="signature" />`;
        }
      } catch (e) {}
      h.appendChild(left);
      h.appendChild(right);
      node.appendChild(h);

      const hr = document.createElement("hr");
      hr.style.margin = "12px 0";
      hr.style.border = "none";
      hr.style.height = "1px";
      hr.style.background = "#eef2ff";
      node.appendChild(hr);

      const body = document.createElement("div");
      body.style.display = "flex";
      body.style.gap = "18px";

      const info = document.createElement("div");
      info.style.flex = "1";
      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";

      const addRow = (label, value) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.style.padding = "6px";
        td1.style.fontWeight = "700";
        td1.style.color = "#6b7280";
        td1.style.width = "140px";
        td1.textContent = label;
        const td2 = document.createElement("td");
        td2.style.padding = "6px";
        td2.textContent = value || "";
        tr.appendChild(td1);
        tr.appendChild(td2);
        table.appendChild(tr);
      };

      addRow("Name", student.name);
      addRow("Roll", student.roll_number);
      addRow("Class", student.class || "");
      addRow("DOB", student.dob || "");
      addRow("Admission", student.admission_date || "");
      addRow("Contact", student.contact_number || "");
      addRow("Address", student.address || "");

      info.appendChild(table);
      const photoWrap = document.createElement("div");
      photoWrap.style.width = "220px";
      if (student.photo) {
        const pi = document.createElement("img");
        pi.src = student.photo;
        pi.style.width = "220px";
        pi.style.height = "220px";
        pi.style.objectFit = "cover";
        pi.style.borderRadius = "8px";
        photoWrap.appendChild(pi);
      } else {
        const ph = document.createElement("div");
        ph.style.width = "220px";
        ph.style.height = "220px";
        ph.style.border = "1px dashed #e6eef9";
        ph.style.borderRadius = "8px";
        ph.style.display = "flex";
        ph.style.alignItems = "center";
        ph.style.justifyContent = "center";
        ph.style.color = "#9ca3af";
        ph.textContent = "No photo";
        photoWrap.appendChild(ph);
      }

      body.appendChild(info);
      body.appendChild(photoWrap);
      node.appendChild(body);

      const footer = document.createElement("div");
      footer.style.marginTop = "18px";
      footer.style.display = "flex";
      footer.style.justifyContent = "space-between";
      footer.style.color = "#6b7280";
      footer.style.fontSize = "12px";
      footer.textContent = `Generated: ${new Date().toLocaleString()} • Student Database`;
      node.appendChild(footer);

      // show modal if exists
      if (modal && modalCard) {
        modalCard.innerHTML = "";
        modalCard.appendChild(node);
        // attach actions
        const actions = document.createElement("div");
        actions.style.display = "flex";
        actions.style.justifyContent = "flex-end";
        actions.style.gap = "8px";
        actions.style.marginTop = "12px";
        const dl = document.createElement("button");
        dl.textContent = "Download PDF";
        dl.onclick = () => generatePdf(node, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
        const close = document.createElement("button");
        close.textContent = "Close";
        close.onclick = () => modal.classList.add("hidden");
        actions.appendChild(dl);
        actions.appendChild(close);
        modalCard.appendChild(actions);
        modal.classList.remove("hidden");
        modal.scrollTop = 0;
      } else {
        // fallback: directly make pdf
        await generatePdf(node, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
      }
    } catch (e) {
      errLog("previewPdf err", e);
      showMessage("Preview failed: " + (e.message || e));
    }
  }

  async function generatePdf(node, filename = "profile.pdf") {
    try {
      const scale = 2;
      const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 40;
      const width = pageW - margin * 2;
      const height = (canvas.height / canvas.width) * width;
      pdf.addImage(imgData, "JPEG", margin, 40, width, height);
      pdf.save(filename);
    } catch (e) {
      errLog("generatePdf err", e);
      showMessage("PDF generation failed: " + (e.message || e));
    }
  }

  // ---------- refresh / boot ----------
  async function refreshAll() {
    await Promise.allSettled([renderTable(), renderAdminList()]);
  }

  async function init() {
    // check table
    const tableOk = await checkTableExists();
    if (!tableOk) {
      showMessage(`Table "${TABLE}" not found in Supabase. Create the table (id, name, roll_number, photo, created_at, etc.).`);
    }
    // check bucket
    const bucketOk = await checkBucketExists();
    if (!bucketOk) {
      showMessage(`Bucket "${BUCKET}" not found. Create a public storage bucket named "${BUCKET}" in Supabase.`);
    }

    // wire login form if present
    if (loginForm) {
      loginForm.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const email = (emailInput && emailInput.value) || (loginForm.querySelector("input[type=email]") && loginForm.querySelector("input[type=email]").value) || "";
        const password = (passwordInput && passwordInput.value) || (loginForm.querySelector("input[type=password]") && loginForm.querySelector("input[type=password]").value) || "";
        if (!email || !password) return showMessage("Enter email and password");
        await signIn(email, password);
      });
    }

    if (logoutBtn) logoutBtn.addEventListener("click", signOut);

    // wire search if present
    if (searchInput) {
      let t = null;
      searchInput.addEventListener("input", (e) => {
        const v = e.target.value.trim();
        clearTimeout(t);
        t = setTimeout(() => renderSearch(v), 250);
      });
    }

    // wire addForm already done above (uses addForm id)
    // ensure admin visible if session exists
    try {
      const { data } = await supabase.auth.getSession();
      if (data && data.session) {
        toggleAdmin(true);
        await refreshAll();
      } else {
        toggleAdmin(false);
      }
    } catch (e) {
      warn("session check failed", e);
      toggleAdmin(false);
    }
  }

  // Kick off
  document.addEventListener("DOMContentLoaded", init);
})();
