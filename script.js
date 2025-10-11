// ======================
// Supabase Config
// ======================
const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ======================
// Elements
// ======================
const loginForm = document.getElementById("loginForm");
const logoutBtn = document.getElementById("logoutBtn");
const studentForm = document.getElementById("studentForm");
const studentList = document.getElementById("studentList");
const searchInput = document.getElementById("searchInput");

// ======================
// Auth Section
// ======================
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Login failed: " + error.message);
  } else {
    alert("Login successful");
    document.querySelector(".admin-section").classList.remove("hidden");
    loginForm.classList.add("hidden");
    loadStudents();
  }
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  alert("Signed out");
  location.reload();
});

// ======================
// Add / Edit Student
// ======================
studentForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const student = {
    name: e.target.name.value,
    roll_number: e.target.roll.value,
    class: e.target.class.value,
    dob: e.target.dob.value,
    admission_date: e.target.admission.value,
    contact_number: e.target.contact.value,
    address: e.target.address.value,
  };

  // Upload photo if selected
  let photoUrl = "";
  const photoFile = e.target.photo.files[0];
  if (photoFile) {
    const { data, error } = await supabase.storage
      .from("students")
      .upload(`photos/${Date.now()}_${photoFile.name}`, photoFile, {
        cacheControl: "3600",
        upsert: false,
      });
    if (error) console.error("Photo upload error:", error.message);
    else photoUrl = `${SUPABASE_URL}/storage/v1/object/public/students/${data.path}`;
  }

  const { error } = await supabase.from("students").insert([{ ...student, photo: photoUrl }]);
  if (error) alert("Save failed: " + error.message);
  else {
    alert("Student saved!");
    e.target.reset();
    loadStudents();
  }
});

// ======================
// Load Students
// ======================
async function loadStudents() {
  const { data, error } = await supabase.from("students").select("*");
  if (error) {
    console.error(error.message);
    return;
  }
  displayStudents(data);
}

// ======================
// Display Students
// ======================
function displayStudents(students) {
  studentList.innerHTML = "";

  students.forEach((s) => {
    const div = document.createElement("div");
    div.className =
      "student-card bg-white rounded-xl shadow p-4 my-3 flex flex-col sm:flex-row items-center justify-between w-full max-w-4xl mx-auto overflow-hidden";
    div.innerHTML = `
      <div class="flex items-center space-x-4 w-full">
        <img src="${s.photo || "https://via.placeholder.com/80"}" class="w-16 h-16 rounded-full object-cover" alt="student photo">
        <div class="flex-1">
          <h3 class="text-lg font-semibold">${s.name}</h3>
          <p class="text-sm text-gray-600">Roll: ${s.roll_number}</p>
          <p class="text-sm text-gray-600">Class: ${s.class}</p>
        </div>
        <button class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded" data-id="${s.id}">Delete</button>
      </div>
    `;
    studentList.appendChild(div);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) =>
    btn.addEventListener("click", () => deleteStudent(btn.dataset.id))
  );
}

// ======================
// Delete Student
// ======================
async function deleteStudent(id) {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) alert("Delete failed: " + error.message);
  else loadStudents();
}

// ======================
// Search Function
// ======================
searchInput?.addEventListener("input", async (e) => {
  const term = e.target.value.toLowerCase();
  const { data } = await supabase.from("students").select("*");
  const filtered = data.filter(
    (s) =>
      s.name.toLowerCase().includes(term) ||
      s.roll_number.toLowerCase().includes(term) ||
      s.class.toLowerCase().includes(term)
  );
  displayStudents(filtered);
});

// ======================
// On load
// ======================
loadStudents();
