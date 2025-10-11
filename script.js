// script.js — regenerated clean JS
// Requirements: your HTML must have the IDs used below.
// Also include supabase, html2canvas and jspdf libs before this script.

(() => {
  // ---------- CONFIG ----------
  const SUPABASE_URL = "https://rufljtftrrdpjhfhkwir.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmxqdGZ0cnJkcGpoZmhrd2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjE5NjcsImV4cCI6MjA3NTczNzk2N30.0W70Dt4P4blJMMwU1rYeEjTbW4uO_dXyOtgPUbwRPsc";
  const BUCKET = "students"; // bucket must exist and be public

  const { createClient } = window.supabase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ---------- DOM refs ----------
  const loginSection = document.getElementById("login-section");
  const loginForm = document.getElementById("login-form");
  const adminPanel = document.getElementById("admin-panel");
  const logoutBtn = document.getElementById("logout-btn");

  const addForm = document.getElementById("add-student-form");
  const inputName = document.getElementById("student-name");
  const inputRoll = document.getElementById("student-roll");
  const inputPhoto = document.getElementById("student-photo");

  const searchInput = document.getElementById("search-input");
  const searchResults = document.getElementById("search-results");

  const studentsTableBody = document.getElementById("students-table-body");
  const adminList = document.getElementById("adminList"); // optional area if present
  const modal = document.getElementById("modal"); // optional modal container
  const modalCard = document.getElementById("modalCard"); // inside modal

  // safety: ensure required elements exist
  function elOrWarn(id) {
    const e = document.getElementById(id);
    if (!e) console.warn(`Element #${id} not found in DOM`);
    return e;
  }

  // ---------- helpers ----------
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showSectionLoggedIn(isLoggedIn) {
    if (loginSection) loginSection.style.display = isLoggedIn ? "none" : "";
    if (adminPanel) adminPanel.style.display = isLoggedIn ? "" : "none";
  }

  // create student card DOM safely (used for admin list and search results)
  function createStudentCard(student, options = {}) {
    // options: { forAdmin: bool }
    const card = document.createElement("div");
    card.className = options.forAdmin ? "student-card-admin" : "student-card";

    const left = document.createElement("div");
    left.style.width = "72px";
    left.style.flex = "0 0 72px";

    const img = document.createElement("img");
    img.alt = student.name || "photo";
    img.style.width = "72px";
    img.style.height = "72px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "6px";
    img.style.background = "#f3f4f6";
    if (student.photo) img.src = student.photo;
    else img.src = ""; // empty — onerror in CSS or hide

    left.appendChild(img);

    const center = document.createElement("div");
    center.style.flex = "1";
    const title = document.createElement("div");
    title.style.fontWeight = "700";
    title.textContent = student.name || "No name";
    const meta = document.createElement("div");
    meta.className = "small muted";
    meta.textContent = `Roll: ${student.roll_number || ""} ${student.class ? " • " + student.class : ""}`;
    center.appendChild(title);
    center.appendChild(meta);

    card.appendChild(left);
    card.appendChild(center);

    if (options.forAdmin) {
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.flexDirection = "column";
      actions.style.gap = "8px";
      actions.style.alignItems = "flex-end";
      actions.style.marginLeft = "12px";

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "btn-ghost";
      editBtn.onclick = () => prefillEdit(student);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.onclick = () => deleteStudent(student.id);

      const previewBtn = document.createElement("button");
      previewBtn.textContent = "Preview";
      previewBtn.className = "btn-primary";
      previewBtn.onclick = () => previewPdf(student);

      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(previewBtn);

      card.appendChild(actions);
    } else {
      const actionRow = document.createElement("div");
      actionRow.style.marginLeft = "12px";
      actionRow.style.display = "flex";
      actionRow.style.gap = "8px";
      const previewBtn = document.createElement("button");
      previewBtn.textContent = "Preview / PDF";
      previewBtn.className = "btn-primary";
      previewBtn.onclick = () => previewPdf(student);
      actionRow.appendChild(previewBtn);
      card.appendChild(actionRow);
    }

    return card;
  }

  // ---------- AUTH ----------
  async function signIn(email, password) {
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        alert("Login failed: " + res.error.message);
        return false;
      }
      return true;
    } catch (err) {
      alert("Login error: " + (err.message || err));
      return false;
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      showSectionLoggedIn(false);
    } catch (err) {
      console.warn("signOut err:", err);
    }
  }

  // ---------- UPLOAD PHOTO ----------
  async function uploadPhotoFile(file) {
    if (!file) return null;
    // ensure bucket exists — attempt upload and detect bucket-not-found
    const fileName = `photos/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const up = await supabase.storage.from(BUCKET).upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (up.error) {
      // show clear guidance on bucket missing
      const msg = up.error.message || "";
      if (msg.toLowerCase().includes("bucket") || msg.toLowerCase().includes("not found")) {
        alert(`Upload error: bucket not found. Create a public storage bucket named '${BUCKET}' in Supabase Storage.`);
      } else {
        alert("Upload error: " + msg);
      }
      throw up.error;
    }

    const pub = await supabase.storage.from(BUCKET).getPublicUrl(fileName);
    if (pub.error || !pub.data || !pub.data.publicUrl) {
      throw new Error("Failed to get public URL for uploaded file.");
    }
    return pub.data.publicUrl;
  }

  // ---------- CRUD ----------
  async function addStudent({ name, roll_number, className, dob, admission_date, contact_number, address, photoFile }) {
    try {
      let photoUrl = null;
      if (photoFile) {
        photoUrl = await uploadPhotoFile(photoFile);
      }
      const payload = {
        name,
        roll_number,
        class: className || null,
        dob: dob || null,
        admission_date: admission_date || null,
        contact_number: contact_number || null,
        address: address || null,
        photo: photoUrl || null,
      };
      const ins = await supabase.from("students").insert([payload]);
      if (ins.error) throw ins.error;
      return ins.data && ins.data[0];
    } catch (err) {
      console.error("addStudent error", err);
      alert("Failed to add student: " + (err.message || err));
      return null;
    }
  }

  async function updateStudent(id, updates) {
    try {
      const res = await supabase.from("students").update(updates).eq("id", id);
      if (res.error) throw res.error;
      return res.data;
    } catch (err) {
      console.error("updateStudent err", err);
      alert("Update failed: " + (err.message || err));
      return null;
    }
  }

  async function deleteStudent(id) {
    if (!confirm("Delete student?")) return;
    try {
      const res = await supabase.from("students").delete().eq("id", id);
      if (res.error) throw res.error;
      await refreshAll();
    } catch (err) {
      console.error("deleteStudent err", err);
      alert("Delete failed: " + (err.message || err));
    }
  }

  // ---------- READ & RENDER ----------
  async function fetchStudents(filter = null) {
    try {
      let query = supabase.from("students").select("*").order("created_at", { ascending: false });
      if (filter && filter.q) {
        const q = filter.q;
        // search name or roll
        query = supabase.from("students").select("*").or(`name.ilike.%${q}%,roll_number.ilike.%${q}%`);
      }
      const res = await query;
      if (res.error) throw res.error;
      return res.data || [];
    } catch (err) {
      console.error("fetchStudents err", err);
      return [];
    }
  }

  async function renderStudentsTable() {
    const tbody = studentsTableBody || elOrWarn("students-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";
    const rows = await fetchStudents();
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.textContent = "No students found";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
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
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "btn-danger";
      delBtn.onclick = () => deleteStudent(s.id);

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "btn-ghost";
      editBtn.onclick = () => prefillEdit(s);

      const previewBtn = document.createElement("button");
      previewBtn.textContent = "Preview";
      previewBtn.className = "btn-primary";
      previewBtn.onclick = () => previewPdf(s);

      tdActions.style.display = "flex";
      tdActions.style.gap = "6px";
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);
      tdActions.appendChild(previewBtn);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function renderAdminList() {
    if (!adminList) return;
    adminList.innerHTML = "";
    const rows = await fetchStudents();
    rows.forEach((s) => {
      const card = createStudentCard(s, { forAdmin: true });
      adminList.appendChild(card);
    });
  }

  async function renderSearchResults(q) {
    if (!searchResults) return;
    searchResults.innerHTML = "";
    if (!q) return;
    const rows = await fetchStudents({ q });
    if (!rows.length) {
      searchResults.textContent = "No results";
      return;
    }
    rows.forEach((s) => {
      const card = createStudentCard(s, { forAdmin: false });
      searchResults.appendChild(card);
    });
  }

  // ---------- UI: prefill edit ----------
  let editingId = null;
  function prefillEdit(student) {
    editingId = student.id;
    if (inputName) inputName.value = student.name || "";
    if (inputRoll) inputRoll.value = student.roll_number || "";
    // scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- REFRESH ALL ----------
  async function refreshAll() {
    await Promise.all([renderStudentsTable(), renderAdminList()]);
    await renderSearchResults(searchInput ? searchInput.value.trim() : "");
  }

  // ---------- FORM HANDLERS ----------
  // login form (if exists)
  if (loginForm) {
    loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const email = (loginForm.querySelector("input[type=email]") || {}).value || "";
      const password = (loginForm.querySelector("input[type=password]") || {}).value || "";
      if (!email || !password) return alert("Enter email and password");
      const ok = await signIn(email, password);
      if (ok) {
        showSectionLoggedIn(true);
        await refreshAll();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut();
    });
  }

  // add / edit form
  if (addForm) {
    addForm.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const name = inputName ? inputName.value.trim() : "";
      const roll = inputRoll ? inputRoll.value.trim() : "";
      const file = inputPhoto ? inputPhoto.files[0] : null;
      if (!name || !roll) return alert("Please fill name and roll");
      try {
        if (editingId) {
          let photoUrl = null;
          if (file) photoUrl = await uploadPhotoFile(file);
          const updates = { name, roll_number: roll };
          if (photoUrl) updates.photo = photoUrl;
          await updateStudent(editingId, updates);
          editingId = null;
        } else {
          await addStudent({ name, roll_number: roll, photoFile: file });
        }
        addForm.reset();
        await refreshAll();
      } catch (err) {
        // errors shown already in helper functions
      }
    });
  }

  // search input
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener("input", (e) => {
      const q = e.target.value.trim();
      clearTimeout(timeout);
      timeout = setTimeout(() => renderSearchResults(q), 250);
    });
  }

  // ---------- PDF preview & generation ----------
  async function previewPdf(student) {
    // build a clean DOM node (not string templates)
    const previewNode = document.createElement("div");
    previewNode.style.width = "800px";
    previewNode.style.padding = "20px";
    previewNode.style.background = "#fff";
    previewNode.style.color = "#111";
    previewNode.style.fontFamily = "Inter, Arial";

    // header
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    const leftH = document.createElement("div");
    const schoolTitle = document.createElement("div");
    schoolTitle.style.fontSize = "20px";
    schoolTitle.style.fontWeight = "800";
    schoolTitle.textContent = "SCHOOL NAME";
    const schoolSub = document.createElement("div");
    schoolSub.style.color = "#6b7280";
    schoolSub.style.marginTop = "6px";
    schoolSub.textContent = "Street Address • Contact";
    leftH.appendChild(schoolTitle);
    leftH.appendChild(schoolSub);

    const rightH = document.createElement("div");
    // try to load signature from bucket path
    const sigImg = document.createElement("img");
    sigImg.style.height = "60px";
    sigImg.style.objectFit = "contain";
    try {
      const pub = await supabase.storage.from(BUCKET).getPublicUrl("signature/school-sign.png");
      if (pub && pub.data && pub.data.publicUrl) sigImg.src = pub.data.publicUrl;
    } catch (e) {
      // ignore
    }
    rightH.appendChild(sigImg);

    header.appendChild(leftH);
    header.appendChild(rightH);
    previewNode.appendChild(header);

    // hr
    const hr = document.createElement("hr");
    hr.style.margin = "14px 0";
    hr.style.border = "none";
    hr.style.height = "1px";
    hr.style.background = "#eef2ff";
    previewNode.appendChild(hr);

    // body area with table and photo
    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.gap = "18px";

    const tableWrap = document.createElement("div");
    tableWrap.style.flex = "1";

    const infoTable = document.createElement("table");
    infoTable.style.width = "100%";
    infoTable.style.borderCollapse = "collapse";
    const addRow = (label, value) => {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.style.padding = "6px";
      td1.style.fontWeight = "700";
      td1.style.width = "140px";
      td1.style.color = "#6b7280";
      td1.textContent = label;
      const td2 = document.createElement("td");
      td2.style.padding = "6px";
      td2.textContent = value || "";
      tr.appendChild(td1);
      tr.appendChild(td2);
      infoTable.appendChild(tr);
    };

    addRow("Name", student.name);
    addRow("Roll", student.roll_number);
    addRow("Class", student.class || "");
    addRow("DOB", student.dob || "");
    addRow("Admission", student.admission_date || "");
    addRow("Contact", student.contact_number || "");
    addRow("Address", student.address || "");

    tableWrap.appendChild(infoTable);

    const photoWrap = document.createElement("div");
    photoWrap.style.width = "220px";
    if (student.photo) {
      const pimg = document.createElement("img");
      pimg.src = student.photo;
      pimg.style.width = "220px";
      pimg.style.height = "220px";
      pimg.style.objectFit = "cover";
      pimg.style.borderRadius = "8px";
      pimg.onerror = () => (pimg.style.display = "none");
      photoWrap.appendChild(pimg);
    } else {
      const placeholder = document.createElement("div");
      placeholder.style.width = "220px";
      placeholder.style.height = "220px";
      placeholder.style.border = "1px dashed #e6eef9";
      placeholder.style.borderRadius = "8px";
      placeholder.style.display = "flex";
      placeholder.style.alignItems = "center";
      placeholder.style.justifyContent = "center";
      placeholder.style.color = "#9ca3af";
      placeholder.textContent = "No photo";
      photoWrap.appendChild(placeholder);
    }

    body.appendChild(tableWrap);
    body.appendChild(photoWrap);
    previewNode.appendChild(body);

    // footer
    const foot = document.createElement("div");
    foot.style.marginTop = "18px";
    foot.style.display = "flex";
    foot.style.justifyContent = "space-between";
    foot.style.color = "#6b7280";
    foot.style.fontSize = "12px";
    foot.innerHTML = `<div>Generated: ${new Date().toLocaleString()}</div><div>Student Database</div>`;
    previewNode.appendChild(foot);

    // show preview in modal if available, else open PDF immediately
    if (modal && modalCard) {
      // clear and append
      modalCard.innerHTML = "";
      modalCard.appendChild(previewNode);

      // add buttons
      const actions = document.createElement("div");
      actions.style.display = "flex";
      actions.style.justifyContent = "flex-end";
      actions.style.gap = "8px";
      actions.style.marginTop = "10px";
      const downloadBtn = document.createElement("button");
      downloadBtn.className = "btn-primary";
      downloadBtn.textContent = "Download PDF";
      const closeBtn = document.createElement("button");
      closeBtn.className = "btn-ghost";
      closeBtn.textContent = "Close";
      closeBtn.onclick = () => modal.classList.add("hidden");
      downloadBtn.onclick = () => generatePdf(previewNode, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
      actions.appendChild(downloadBtn);
      actions.appendChild(closeBtn);
      modalCard.appendChild(actions);
      modal.classList.remove("hidden");
      modal.scrollTop = 0;
    } else {
      await generatePdf(previewNode, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
    }
  }

  async function generatePdf(node, filename = "profile.pdf") {
    try {
      // high-res rendering
      const scale = 2;
      const canvas = await html2canvas(node, { scale, useCORS: true, backgroundColor: 
