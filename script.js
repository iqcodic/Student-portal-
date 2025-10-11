// =======================
// 🔧 Supabase Config
// =======================
const SUPABASE_URL = "https://rufljtftrrdpjhfhkwir.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmxqdGZ0cnJkcGpoZmhrd2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjE5NjcsImV4cCI6MjA3NTczNzk2N30.0W70Dt4P4blJMMwU1rYeEjTbW4uO_dXyOtgPUbwRPsc";
const BUCKET = "students";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =======================
// ⚙️ Auth Section
// =======================
const loginForm = document.getElementById("login-form");
const adminPanel = document.getElementById("admin-panel");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("❌ Login failed: " + error.message);
    } else {
      alert("✅ Login successful!");
      loginForm.style.display = "none";
      adminPanel.style.display = "block";
      loadStudents();
    }
  });
}

// =======================
// 📸 Upload Student Photo
// =======================
async function uploadPhoto(file) {
  if (!file) return null;

  const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(`photos/${fileName}`, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    alert("❌ Upload error: " + uploadError.message);
    return null;
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(`photos/${fileName}`);

  return data.publicUrl;
}

// =======================
// 🧾 Add Student
// =======================
const addForm = document.getElementById("add-student-form");

if (addForm) {
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("student-name").value.trim();
    const roll = document.getElementById("student-roll").value.trim();
    const file = document.getElementById("student-photo").files[0];

    const photoUrl = await uploadPhoto(file);
    if (!photoUrl) return;

    const { error } = await supabase.from("students").insert([
      {
        name: name,
        roll_number: roll,
        photo: photoUrl,
      },
    ]);

    if (error) {
      alert("❌ Error adding student: " + error.message);
    } else {
      alert("✅ Student added!");
      addForm.reset();
      loadStudents();
    }
  });
}

// =======================
// 📋 Load Student List
// =======================
async function loadStudents() {
  const tableBody = document.getElementById("students-table-body");
  if (!tableBody) return;

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tableBody.innerHTML = `<tr><td colspan="4">❌ Error: ${error.message}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4">No students found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  data.forEach((student) => {
    const row = `
      <tr>
        <td>${student.roll_number}</td>
        <td>${student.name}</td>
        <td><img src="${student.photo}" alt="photo" class="student-photo"></td>
        <td>
          <button onclick="deleteStudent('${student.id}')">🗑️</button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

// =======================
// ❌ Delete Student
// =======================
async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) alert("❌ Error: " + error.message);
  else {
    alert("✅ Deleted!");
    loadStudents();
  }
}

// =======================
// 🔍 Search Student
// =======================
const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .ilike("name", `%${query}%`);

    const list = document.getElementById("search-results");
    if (error || !data) {
      list.innerHTML = "Error searching students";
      return;
    }

    list.innerHTML = data
      .map(
        (s) => `
      <div class="student-card">
        <img src="${s.photo}" class="student-photo" alt="photo">
        <p><b>${s.name}</b></p>
        <p>Roll No: ${s.roll_number}</p>
      </div>`
      )
      .join("");
  });
}
