// --- 1. Firebase Configuration and Initialization ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCoDEx4M0jk33ZpDNo3FfrMOdQw6oTxxW8",
  authDomain: "hytech-c0781.firebaseapp.com",
  projectId: "hytech-c0781",
  storageBucket: "hytech-c0781.firebasestorage.app",
  messagingSenderId: "780667888469",
  appId: "1:780667888469:web:515566272a0bbfb26705dc",
  measurementId: "G-29YXKTRK6E"
};

// Initialize Firebase App and Services (using compat version imports from HTML)
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.firestore();
const storage = app.storage();
const studentsCollection = db.collection('students');

// --- 2. Admin Login and Logout ---
function adminLogin() {
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert("Login Successful! Redirecting to Admin Panel.");
            window.location.href = 'admin.html';
        })
        .catch((error) => {
            alert("Login Failed: " + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        alert("Logged out.");
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// Check auth state for Admin Panel protection
auth.onAuthStateChanged((user) => {
    // Only applies to admin.html
    if (window.location.pathname.includes('admin.html') && !user) {
        alert("You must be logged in to access the Admin Panel.");
        window.location.href = 'index.html';
    }
});


// --- 3. Admin: Add Student (Create/Upload) ---
async function addStudent() {
    const rollNumber = document.getElementById('rollNumber').value;
    const studentName = document.getElementById('studentName').value;
    const studentPictureFile = document.getElementById('studentPictureFile').files[0];

    if (!rollNumber || !studentName || !studentPictureFile) {
        alert("Please fill all required fields and upload a picture.");
        return;
    }

    try {
        // A. Upload Picture to Firebase Storage
        const storageRef = storage.ref('student_pictures/' + rollNumber + '_' + studentPictureFile.name);
        const snapshot = await storageRef.put(studentPictureFile);
        const pictureURL = await snapshot.ref.getDownloadURL();

        // B. Save data to Firestore
        await studentsCollection.add({
            rollNumber: rollNumber,
            studentName: studentName,
            email: document.getElementById('email').value,
            age: parseInt(document.getElementById('age').value),
            // ... Add all other fields here ...
            address: document.getElementById('address').value,
            pictureURL: pictureURL,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert("Student data saved successfully!");
        loadStudents(); // Refresh the list
    } catch (e) {
        console.error("Error adding document or uploading image: ", e);
        alert("Error saving data: " + e.message);
    }
}


// --- 4. Admin: Read All Students ---
function loadStudents() {
    const tableBody = document.getElementById('studentsTableBody');
    if (!tableBody) return; // Stop if we're not on admin.html

    tableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    studentsCollection.get().then((querySnapshot) => {
        tableBody.innerHTML = ''; // Clear loading text
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = tableBody.insertRow();
            row.insertCell(0).textContent = data.rollNumber;
            row.insertCell(1).textContent = data.studentName;
            
            const actionsCell = row.insertCell(2);
            actionsCell.innerHTML = `
                <button onclick="editStudent('${doc.id}')">Edit</button>
                <button onclick="deleteStudent('${doc.id}', '${data.pictureURL}')">Delete</button>
            `;
        });
    }).catch(error => {
        console.error("Error fetching documents: ", error);
        tableBody.innerHTML = '<tr><td colspan="3">Failed to load students.</td></tr>';
    });
}


// --- 5. Student Panel: Search by Roll Number ---
async function searchStudent() {
    const rollNumber = document.getElementById('studentRollNumber').value;
    const outputDiv = document.getElementById('studentDetailsOutput');
    outputDiv.innerHTML = 'Searching...';

    if (!rollNumber) {
        outputDiv.innerHTML = 'Please enter a Roll Number.';
        return;
    }

    try {
        // Query Firestore where rollNumber matches
        const query = studentsCollection.where('rollNumber', '==', rollNumber).limit(1);
        const snapshot = await query.get();

        if (snapshot.empty) {
            outputDiv.innerHTML = '<h2>Student Not Found!</h2>';
            return;
        }

        const studentDoc = snapshot.docs[0];
        const data = studentDoc.data();
        
        // Display the results
        outputDiv.innerHTML = `
            <h2>Student Details</h2>
            <img src="${data.pictureURL}" alt="${data.studentName}" width="150"><br>
            <strong>Name:</strong> ${data.studentName}<br>
            <strong>Roll Number:</strong> ${data.rollNumber}<br>
            <strong>Email:</strong> ${data.email}<br>
            <strong>Address:</strong> ${data.address}<br>
            `;

    } catch (error) {
        console.error("Error fetching student data:", error);
        outputDiv.innerHTML = 'An error occurred while fetching data.';
    }
}

// --- 6. Admin: Delete Student (Advanced - requires Storage path parsing) ---
// This is a simplified function. Image deletion is complex and should be handled carefully.
function deleteStudent(docId, pictureURL) {
    if (!confirm('Are you sure you want to delete this student?')) return;

    // 1. Delete the Firestore document
    studentsCollection.doc(docId).delete().then(() => {
        alert("Student deleted successfully!");
        loadStudents(); // Refresh the list

        // OPTIONAL: Delete the image from Storage (Requires extracting the path from pictureURL)
        const pictureRef = storage.refFromURL(pictureURL);
        pictureRef.delete().then(() => {
            console.log("Image deleted from Storage.");
        }).catch(error => {
            console.error("Error deleting image from Storage:", error);
            // This error doesn't stop the student from being deleted from the DB
        });

    }).catch(error => {
        console.error("Error deleting document: ", error);
        alert("Error deleting student data.");
    });
}

// --- EDIT/UPDATE logic will be similar to ADD, but you use .update() instead of .add() ---
// You will need to create a modal or a separate form to handle the update.
function editStudent(docId) {
    alert("Functionality to edit student with ID: " + docId + " needs to be implemented. Use studentsCollection.doc(docId).get() to fetch data, populate a form, and then use .update() to save changes.");
    // Implementation steps:
    // 1. Fetch the student's data using docId.
    // 2. Open a modal/form and pre-fill the fields with the fetched data.
    // 3. On form submission, call studentsCollection.doc(docId).update(newData).
}
