/* script.js
 - Shared JS for index.html (SEARCH) and admin.html (ADMIN).
 - Make sure both HTML files include supabase, html2canvas, jspdf, and link this script.
*/

/* --------- CONFIG: set your Supabase project values here --------- */
const SUPABASE_URL = "https://rufljtftrrdpjhfhkwir.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZmxqdGZ0cnJkcGpoZmhrd2lyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjE5NjcsImV4cCI6MjA3NTczNzk2N30.0W70Dt4P4blJMMwU1rYeEjTbW4uO_dXyOtgPUbwRPsc";
const BUCKET = "students"; // must exist and be public
/* ---------------------------------------------------------------- */

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utility
function e(id){ return document.getElementById(id); }
function escapeHtml(s=''){ return String(s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ---------- PAGE INITIALIZERS ----------
window.initSearchPage = function initSearchPage(){
  const searchBtn = e('searchBtn') || e('btnSearch');
  const queryInput = e('searchQuery') || e('searchInput') || e('q') || e('searchQuery');
  if(!searchBtn || !queryInput){
    // also handle other id variants
  }
  // map to local ids used in the delivered files
  const qEl = document.getElementById('searchQuery') || document.getElementById('searchInput') || document.getElementById('q');
  const btn = document.getElementById('searchBtn') || document.getElementById('btnSearch');
  const resultBox = document.getElementById('searchResults') || document.getElementById('results');

  if(btn && qEl){
    btn.addEventListener('click', () => doSearch(qEl.value.trim(), resultBox));
    qEl.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter'){ ev.preventDefault(); doSearch(qEl.value.trim(), resultBox); }});
  }
};

window.initAdminPage = function initAdminPage(){
  // Hook up auth and admin UI
  const signInBtn = e('btnSignIn') || e('btnLogin') || e('loginBtn');
  const signOutBtn = e('btnSignOut') || e('btnLogout') || e('logoutBtn');
  if(signInBtn){
    signInBtn.addEventListener('click', adminSignIn);
  }
  if(signOutBtn){
    signOutBtn.addEventListener('click', adminSignOut);
  }

  // Save / Clear / Refresh / CSV
  const saveBtn = e('btnSave') || e('btnSave');
  const clearBtn = e('btnClear') || e('btnClear');
  const refreshBtn = e('btnRefresh') || e('btnRefresh');
  const csvBtn = e('btnExportCsv') || e('btnCSV') || e('btnExportCsv');

  if(saveBtn) saveBtn.addEventListener('click', saveStudent);
  if(clearBtn) clearBtn.addEventListener('click', ()=>{ const form = document.getElementById('studentForm'); if(form) form.reset(); editingId=null; });
  if(refreshBtn) refreshBtn.addEventListener('click', refreshAdminList);
  if(csvBtn) csvBtn.addEventListener('click', downloadCSV);

  // Auto check session
  (async()=>{
    try{
      const { data } = await supabase.auth.getSession();
      if(data?.session){
        showAdminArea(true);
        refreshAdminList();
      } else {
        showAdminArea(false);
      }
    }catch(e){ showAdminArea(false); }
  })();
};

// ---------- SEARCH (used by index.html) ----------
async function doSearch(query, resultBox){
  const info = e('searchInfo') || e('searchInfo') || e('resultsInfo') || e('searchInfo');
  if(info) info.textContent = '';
  if(!query){
    if(info) info.textContent = 'Please enter a roll or name';
    if(resultBox) resultBox.innerHTML = '';
    return;
  }
  if(resultBox) resultBox.innerHTML = '<div class="small muted">Searching…</div>';

  try{
    const isNum = /^[0-9]+$/.test(query);
    let res;
    if(isNum){
      res = await supabase.from('students').select('*').ilike('roll_number', query);
    } else {
      // support both name or full_name
      res = await supabase.from('students').select('*').or(`name.ilike.%${query}%,full_name.ilike.%${query}%,roll_number.ilike.%${query}%`);
    }
    if(res.error) throw res.error;
    const rows = res.data || [];
    if(!rows.length){
      if(resultBox) resultBox.innerHTML = '<div class="small muted">No student found</div>';
      return;
    }
    // render
    if(resultBox) {
      resultBox.innerHTML = '';
      rows.forEach(s => {
        const photo = s.photo || '';
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
          <img src="${escapeHtml(photo)}" onerror="this.style.display='none'">
          <div class="info">
            <h2>${escapeHtml(s.name || s.full_name || '')}</h2>
            <table>
              <tr><td class="label">Roll</td><td>${escapeHtml(s.roll_number||'')}</td></tr>
              <tr><td class="label">Class</td><td>${escapeHtml(s.class||'')}</td></tr>
              <tr><td class="label">DOB</td><td>${escapeHtml(s.dob||'')}</td></tr>
              <tr><td class="label">Admission</td><td>${escapeHtml(s.admission_date||'')}</td></tr>
              <tr><td class="label">Contact</td><td>${escapeHtml(s.contact_number||'')}</td></tr>
              <tr><td class="label">Address</td><td>${escapeHtml(s.address||'')}</td></tr>
            </table>
            <div class="actions" style="margin-top:8px">
              <button class="btn-ghost" onclick='window.openImage("${escapeHtml(photo)}")'>Open Photo</button>
              <button class="btn-primary" onclick='window.previewPdf("${encodeURIComponent(JSON.stringify(s))}")'>Preview / Print</button>
            </div>
          </div>
        `;
        resultBox.appendChild(card);
      });
    }
  }catch(err){
    console.error(err);
    if(resultBox) resultBox.innerHTML = '<div class="small muted">Search error</div>';
  }
}

// ---------- ADMIN AUTH ----------
async function adminSignIn(){
  const email = (e('adminEmail') && e('adminEmail').value) || (e('adminEmail') && e('adminEmail').value) || '';
  const password = (e('adminPassword') && e('adminPassword').value) || (e('adminPass') && e('adminPass').value) || '';
  if(!email || !password) return alert('Enter admin email & password');
  try{
    const btn = e('btnSignIn') || e('btnLogin') || e('loginBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Signing in...'; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(btn){ btn.disabled = false; btn.textContent = 'Sign in'; }
    if(error) return alert('Sign in failed: ' + error.message);
    showAdminArea(true);
    refreshAdminList();
  }catch(err){
    alert('Sign in error: ' + (err.message||err));
  }
}
async function adminSignOut(){
  await supabase.auth.signOut();
  showAdminArea(false);
}

function showAdminArea(show){
  const area = e('adminArea') || e('adminArea');
  const signOutBtn = e('btnSignOut') || e('btnLogout') || e('logoutBtn');
  const signInBtn = e('btnSignIn') || e('btnLogin') || e('loginBtn');
  const adminInfo = e('adminInfo') || e('adminUser');
  if(show){
    if(area) area.classList.remove('hidden');
    if(signOutBtn) signOutBtn.classList.remove('hidden');
    if(signInBtn) signInBtn.classList.add('hidden');
    if(adminInfo) adminInfo.textContent = 'Signed in';
  } else {
    if(area) area.classList.add('hidden');
    if(signOutBtn) signOutBtn.classList.add('hidden');
    if(signInBtn) signInBtn.classList.remove('hidden');
    if(adminInfo) adminInfo.textContent = '';
  }
}

// ---------- ADMIN CRUD ----------
let editingId = null;

async function uploadPhotoFile(file){
  if(!file) return null;
  const path = `photos/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file);
  if(up.error){
    const msg = up.error.message || JSON.stringify(up.error);
    if(msg.toLowerCase().includes('bucket') || msg.toLowerCase().includes('not found')){
      alert("Upload error: bucket not found. Create a public storage bucket named '" + BUCKET + "' in Supabase Storage.");
      throw new Error('bucket_not_found');
    }
    throw up.error;
  }
  const pub = await supabase.storage.from(BUCKET).getPublicUrl(path);
  if(pub.error || !pub.data || !pub.data.publicUrl) throw new Error('Failed to get public URL');
  return pub.data.publicUrl;
}

async function saveStudent(){
  const name = e('f_name') ? e('f_name').value.trim() : (e('name') && e('name').value.trim());
  const roll = e('f_roll') ? e('f_roll').value.trim() : (e('roll') && e('roll').value.trim());
  if(!name || !roll) return alert('Name and Roll required');
  const klass = e('f_class') ? e('f_class').value.trim() : (e('cls') && e('cls').value.trim());
  const dob = e('f_dob') ? e('f_dob').value : (e('dob') && e('dob').value);
  const admission = e('f_admission') ? e('f_admission').value : (e('adm') && e('adm').value);
  const contact = e('f_contact') ? e('f_contact').value : (e('contact') && e('contact').value);
  const address = e('f_address') ? e('f_address').value.trim() : (e('addr') && e('addr').value.trim());
  const fileInput = e('f_photo') || e('photo');

  try{
    let photoUrl = null;
    if(fileInput && fileInput.files && fileInput.files[0]){
      photoUrl = await uploadPhotoFile(fileInput.files[0]);
    }

    if(editingId){
      const { error } = await supabase.from('students').update({
        name, roll_number: roll, class: klass, dob, admission_date: admission, contact_number: contact, address, ...(photoUrl?{photo:photoUrl}:{})
      }).eq('id', editingId);
      if(error) throw error;
      alert('Updated');
      editingId = null;
    } else {
      const { error } = await supabase.from('students').insert([{
        name, roll_number: roll, class: klass, dob, admission_date: admission, contact_number: contact, address: address, photo: photoUrl
      }]);
      if(error) throw error;
      alert('Added');
    }
    if(e('studentForm')) e('studentForm').reset();
    refreshAdminList();
  }catch(err){
    if(err.message !== 'bucket_not_found') console.error(err);
  }
}

async function refreshAdminList(){
  const list = e('adminList') || e('adminList');
  if(!list) return;
  list.innerHTML = '<div class="small muted">Loading…</div>';
  try{
    const { data, error } = await supabase.from('students').select('*').order('created_at',{ascending:false}).limit(500);
    if(error) throw error;
    list.innerHTML = '';
    (data||[]).forEach(s => {
      const d = document.createElement('div');
      d.className = 'student-card';
      d.innerHTML = `
        <img src="${escapeHtml(s.photo||'')}" onerror="this.style.display='none'">
        <div class="info">
          <h2>${escapeHtml(s.name||'')}</h2>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button class="btn-ghost" onclick='(${prefillEdit.toString()})("${encodeURIComponent(JSON.stringify(s))}")'>Edit</button>
            <button class="btn-primary" onclick='(${deleteStudent.toString()})("${s.id}")'>Delete</button>
            <button class="btn-ghost" onclick='(${previewPdf.toString()})("${encodeURIComponent(JSON.stringify(s))}")'>Preview</button>
          </div>
        </div>`;
      list.appendChild(d);
    });
  }catch(err){
    console.error(err);
    list.innerHTML = '<div class="small muted">Failed to load list</div>';
  }
}

function prefillEdit(encoded){
  try{
    const s = JSON.parse(decodeURIComponent(encoded));
    editingId = s.id;
    if(e('f_name')) e('f_name').value = s.name || s.full_name || '';
    if(e('f_roll')) e('f_roll').value = s.roll_number || '';
    if(e('f_class')) e('f_class').value = s.class || '';
    if(e('f_dob')) e('f_dob').value = s.dob || '';
    if(e('f_admission')) e('f_admission').value = s.admission_date || '';
    if(e('f_contact')) e('f_contact').value = s.contact_number || '';
    if(e('f_address')) e('f_address').value = s.address || '';
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(e){ console.error(e); }
}

async function deleteStudent(id){
  if(!confirm('Delete student?')) return;
  const { error } = await supabase.from('students').delete().eq('id', id);
  if(error) return alert('Delete failed: ' + error.message);
  refreshAdminList();
}

// ---------- CSV export ----------
async function downloadCSV(){
  try{
    const { data, error } = await supabase.from('students').select('*');
    if(error) throw error;
    if(!data.length) return alert('No rows');
    const keys = Object.keys(data[0]);
    const rows = [keys.join(',')].concat(data.map(r => keys.map(k => `"${(r[k]||'').toString().replace(/"/g,'""')}"`).join(',')));
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'students_export.csv'; a.click(); a.remove();
  }catch(e){
    alert('CSV failed: ' + (e.message||e));
  }
}

// ---------- PREVIEW & PDF ----------
async function previewPdf(encoded){
  try{
    const s = JSON.parse(decodeURIComponent(encoded));
    const signatureUrl = await getPublicUrlSafe('signature/school-sign.png');
    const photo = s.photo || '';
    const html = `
      <div style="font-family:Inter,Arial;color:#0f172a;padding:18px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:800;font-size:18px;color:${'#0b5ed7'}">SCHOOL NAME</div>
            <div style="color:#6b7280;margin-top:6px">Street Address • Contact</div>
          </div>
          <div style="text-align:right">
            ${signatureUrl ? `<img src="${signatureUrl}" style="height:56px;object-fit:contain" />` : `<div style="height:56px;width:160px;border:1px dashed #e6eef9"></div>`}
            <div style="font-size:12px;color:#6b7280;margin-top:6px">Authorized signature</div>
          </div>
        </div>
        <hr style="margin:12px 0;border:none;height:1px;background:#eef6ff" />
        <div style="display:flex;gap:18px">
          <div style="flex:1">
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Name</td><td style="padding:6px">${escapeHtml(s.name||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Roll</td><td style="padding:6px">${escapeHtml(s.roll_number||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Class</td><td style="padding:6px">${escapeHtml(s.class||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">DOB</td><td style="padding:6px">${escapeHtml(s.dob||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Admission</td><td style="padding:6px">${escapeHtml(s.admission_date||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Contact</td><td style="padding:6px">${escapeHtml(s.contact_number||'')}</td></tr>
              <tr><td style="padding:6px;font-weight:700;color:#6b7280">Address</td><td style="padding:6px">${escapeHtml(s.address||'')}</td></tr>
            </table>
          </div>
          <div style="width:220px">
            ${photo ? `<img src="${photo}" style="width:220px;height:220px;object-fit:cover;border-radius:8px;border:1px solid #eef6ff" />` : `<div style="width:220px;height:220px;border-radius:8px;border:1px dashed #e6eef9;display:flex;align-items:center;justify-content:center;color:#9ca3af">No photo</div>`}
          </div>
        </div>
        <div style="margin-top:18px;display:flex;justify-content:space-between;color:#6b7280;font-size:12px">
          <div>Generated: ${new Date().toLocaleString()}</div>
          <div>Student Database</div>
        </div>
      </div>
    `;
    // show in modal (if present) or open direct PDF
    const modal = document.getElementById('modal');
    const modalCard = document.getElementById('modalCard');
    if(modal && modalCard){
      modalCard.innerHTML = html + `<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button id="downloadPdfModal" class="btn-primary">Download PDF</button><button id="closePdfModal" class="btn-ghost">Close</button></div>`;
      modal.classList.remove('hidden');
      document.getElementById('closePdfModal').onclick = ()=>{ modal.classList.add('hidden'); modalCard.innerHTML=''; };
      document.getElementById('downloadPdfModal').onclick = async ()=> {
        const node = modalCard.querySelector('div');
        await generatePdf(node, `${(s.name||'student').replace(/\s+/g,'_')}_profile.pdf`);
      };
    } else {
      // fallback: directly generate
      const tmp = document.createElement('div'); tmp.innerHTML = html; document.body.appendChild(tmp);
      await generatePdf(tmp, `${(s.name||'student').replace(/\s+/g,'_')}_profile.pdf`);
      tmp.remove();
    }
  }catch(e){ console.error(e); alert('Preview failed'); }
};

async function generatePdf(node, filename){
  try{
    const scale = 2; // higher for better quality
    const canvas = await html2canvas(node, { scale, useCORS:true, backgroundColor:'#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit:'pt', format:'a4' });
    const width = pdf.internal.pageSize.getWidth() - 80;
    const height = (canvas.height / canvas.width) * width;
    pdf.addImage(imgData, 'JPEG', 40, 40, width, height);
    pdf.save(filename);
  }catch(e){ console.error(e); alert('PDF generation failed'); }
}

// safe public URL fetch
async function getPublicUrlSafe(path){
  try{
    const res = await supabase.storage.from(BUCKET).getPublicUrl(path);
    if(res.error) return null;
    return res.data && res.data.publicUrl ? res.data.publicUrl : null;
  }catch(e){ return null; }
}

// helper global functions for dynamic button calls
window.previewPdf = previewPdf;
window.prefillEdit = prefillEdit;
window.deleteStudent = deleteStudent;
window.openImage = function(url){ if(!url) return alert('No photo'); window.open(url,'_blank'); };

// initial small auto-run for pages that called init functions earlier
// (initAdminPage / initSearchPage are called from each HTML page)
