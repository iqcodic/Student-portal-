// ✅ Supabase Configuration
const SUPABASE_URL = "https://rufljtftrrdpjhfhkwir.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmxqdGZ0cnJkcGpoZmhrd2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjE5NjcsImV4cCI6MjA3NTczNzk2N30.0W70Dt4P4blJMMwU1rYeEjTbW4uO_dXyOtgPUbwRPsc";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "students";

// ✅ DOM References
const loginSection = document.getElementById("login-section");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const addForm = document.getElementById("add-student-form");
const searchInput = document.getElementById("search-input");

// ----------------------------
// 🧩 LOGIN SYSTEM
// ----------------------------
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
    return;
  }

  loginSection.style.display = "none";
  adminPanel.style.display = "block";
  loadStudents();
});

// ----------------------------
// 🚪 LOGOUT
// ----------------------------
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  adminPanel.style.display = "none";
  loginSection.style.display = "flex";
});

// ----------------------------
// 📤 UPLOAD STUDENT PHOTO
// ----------------------------
async function uploadPhoto(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, file);

  if (error) {
    alert("❌ Upload failed: " + error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// ----------------------------
// ➕ ADD NEW STUDENT
// ----------------------------
addForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("student-name").value.trim();
  const roll = document.getElementById("student-roll").value.trim();
  const file = document.getElementById("student-photo").files[0];

  if (!name || !roll || !file) {
    alert("⚠️ Please fill all fields.");
    return;
  }

  const photoUrl = await uploadPhoto(file);
  if (!photoUrl) return;

  const { error } = await supabase
    .from("students")
    .insert([{ name, roll_number: roll, photo: photoUrl }]);

  if (error) {
    alert("❌ Error adding student: " + error.message);
    return;
  }

  alert("✅ Student added successfully!");
  addForm.reset();
  loadStudents();
});

// ----------------------------
// 📋 LOAD ALL STUDENTS
// ----------------------------
async function loadStudents() {
  const tbody = document.getElementById("students-table-body");

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${error.message}</td></tr>`;
    return;
  }

  tbody.innerHTML = data
    .map(
      (s) => `
    <tr>
      <td>${s.roll_number}</td>
      <td>${s.name}</td>
      <td><img src="${s.photo}" class="student-photo" /></td>
      <td><button onclick="deleteStudent('${s.id}')">Delete</button></td>
    </tr>`
    )
    .join("");
}

// ----------------------------
// ❌ DELETE STUDENT
// ----------------------------
async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;

  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) {
    alert("❌ Error deleting: " + error.message);
    return;
  }

  loadStudents();
}

// ----------------------------
// 🔍 SEARCH STUDENTS BY NAME
// ----------------------------
searchInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim().toLowerCase();
  const list = document.getElementById("search-results");

  if (!query) {
    list.innerHTML = "";
    return;
  }

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .ilike("name", `%${query}%`);

  if (error) {
    list.innerHTML = `<p>Error: ${error.message}</p>`;
    return;
  }

  list.innerHTML = data
    .map(
      (s) => `
    <div class="student-card">
      <img src="${s.photo}" alt="photo">
      <p><b>${s.name}</b></p>
      <p>${s.roll_number}</p>
    </div>`
    )
    .join("");
});
