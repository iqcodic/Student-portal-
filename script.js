async function previewPdf(student) {
  // Create preview container with proper sizing
  const previewNode = document.createElement("div");
  previewNode.style.width = "794px"; // A4 width in pixels at 96dpi
  previewNode.style.padding = "20px";
  previewNode.style.background = "#fff";
  previewNode.style.color = "#111";
  previewNode.style.fontFamily = "Arial, sans-serif";
  previewNode.style.fontSize = "14px";
  previewNode.style.lineHeight = "1.4";
  previewNode.style.boxSizing = "border-box";

  // Header section
  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "flex-start";
  header.style.marginBottom = "20px";
  header.style.flexWrap = "wrap";

  const leftH = document.createElement("div");
  const schoolTitle = document.createElement("div");
  schoolTitle.style.fontSize = "24px";
  schoolTitle.style.fontWeight = "bold";
  schoolTitle.textContent = "SCHOOL NAME";
  
  const schoolSub = document.createElement("div");
  schoolSub.style.color = "#666";
  schoolSub.style.marginTop = "8px";
  schoolSub.style.fontSize = "14px";
  schoolSub.textContent = "Street Address • Contact Info";
  
  leftH.appendChild(schoolTitle);
  leftH.appendChild(schoolSub);

  const rightH = document.createElement("div");
  rightH.style.textAlign = "right";
  const sigImg = document.createElement("img");
  sigImg.style.height = "60px";
  sigImg.style.maxWidth = "150px";
  sigImg.style.objectFit = "contain";
  try {
    const pub = await supabase.storage.from(BUCKET).getPublicUrl("signature/school-sign.png");
    if (pub?.data?.publicUrl) {
      sigImg.src = pub.data.publicUrl;
    } else {
      sigImg.style.display = "none";
    }
  } catch (e) {
    sigImg.style.display = "none";
  }
  rightH.appendChild(sigImg);

  header.appendChild(leftH);
  header.appendChild(rightH);
  previewNode.appendChild(header);

  // Divider
  const hr = document.createElement("hr");
  hr.style.margin = "15px 0";
  hr.style.border = "none";
  hr.style.height = "2px";
  hr.style.background = "#e0e0e0";
  previewNode.appendChild(hr);

  // Main content area
  const body = document.createElement("div");
  body.style.display = "flex";
  body.style.gap = "30px";
  body.style.marginBottom = "20px";
  body.style.minHeight = "400px";

  // Information table (left side)
  const tableWrap = document.createElement("div");
  tableWrap.style.flex = "1";
  tableWrap.style.minWidth = "0"; // Prevent overflow

  const infoTable = document.createElement("table");
  infoTable.style.width = "100%";
  infoTable.style.borderCollapse = "collapse";
  infoTable.style.fontSize = "14px";
  
  const addRow = (label, value) => {
    const tr = document.createElement("tr");
    
    const td1 = document.createElement("td");
    td1.style.padding = "8px 12px";
    td1.style.fontWeight = "600";
    td1.style.width = "120px";
    td1.style.color = "#555";
    td1.style.borderBottom = "1px solid #f0f0f0";
    td1.style.verticalAlign = "top";
    td1.textContent = label;
    
    const td2 = document.createElement("td");
    td2.style.padding = "8px 12px";
    td2.style.borderBottom = "1px solid #f0f0f0";
    td2.style.verticalAlign = "top";
    td2.style.wordBreak = "break-word";
    td2.textContent = value || "N/A";
    
    tr.appendChild(td1);
    tr.appendChild(td2);
    infoTable.appendChild(tr);
  };

  // Add student data rows
  addRow("Name", student.name);
  addRow("Roll", student.roll_number);
  addRow("Class", student.class);
  addRow("DOB", student.dob);
  addRow("Admission", student.admission_date);
  addRow("Contact", student.contact_number);
  addRow("Address", student.address);

  tableWrap.appendChild(infoTable);

  // Photo section (right side)
  const photoWrap = document.createElement("div");
  photoWrap.style.width = "200px";
  photoWrap.style.flexShrink = "0";
  photoWrap.style.textAlign = "center";

  if (student.photo) {
    const pimg = document.createElement("img");
    pimg.src = student.photo;
    pimg.style.width = "180px";
    pimg.style.height = "180px";
    pimg.style.objectFit = "cover";
    pimg.style.borderRadius = "8px";
    pimg.style.border = "2px solid #e0e0e0";
    pimg.onerror = () => {
      pimg.style.display = "none";
      photoWrap.innerHTML = '<div style="color: #999; font-style: italic;">Photo not available</div>';
    };
    photoWrap.appendChild(pimg);
    
    const photoLabel = document.createElement("div");
    photoLabel.style.marginTop = "8px";
    photoLabel.style.color: "#666";
    photoLabel.style.fontSize = "12px";
    photoLabel.textContent = "Student Photo";
    photoWrap.appendChild(photoLabel);
  } else {
    const placeholder = document.createElement("div");
    placeholder.style.width = "180px";
    placeholder.style.height = "180px";
    placeholder.style.border = "2px dashed #ccc";
    placeholder.style.borderRadius = "8px";
    placeholder.style.display = "flex";
    placeholder.style.alignItems = "center";
    placeholder.style.justifyContent = "center";
    placeholder.style.color: "#999";
    placeholder.style.fontStyle = "italic";
    placeholder.style.margin = "0 auto";
    placeholder.textContent = "No photo available";
    photoWrap.appendChild(placeholder);
  }

  body.appendChild(tableWrap);
  body.appendChild(photoWrap);
  previewNode.appendChild(body);

  // Footer
  const foot = document.createElement("div");
  foot.style.marginTop = "30px";
  foot.style.paddingTop = "15px";
  foot.style.borderTop = "2px solid #e0e0e0";
  foot.style.display = "flex";
  foot.style.justifyContent = "space-between";
  foot.style.color = "#666";
  foot.style.fontSize = "12px";
  
  const generated = document.createElement("div");
  generated.textContent = `Generated: ${new Date().toLocaleString()}`;
  
  const source = document.createElement("div");
  source.textContent = "Student Database";
  
  foot.appendChild(generated);
  foot.appendChild(source);
  previewNode.appendChild(foot);

  // Show in modal or generate PDF directly
  if (modal && modalCard) {
    modalCard.innerHTML = "";
    
    // Create scrollable container for modal
    const modalContent = document.createElement("div");
    modalContent.style.maxHeight = "80vh";
    modalContent.style.overflowY = "auto";
    modalContent.style.padding = "10px";
    modalContent.appendChild(previewNode);
    
    modalCard.appendChild(modalContent);

    // Action buttons
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "10px";
    actions.style.marginTop = "15px";
    actions.style.paddingTop: "15px";
    actions.style.borderTop = "1px solid #e0e0e0";
    
    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn-primary";
    downloadBtn.textContent = "Download PDF";
    downloadBtn.onclick = () => generatePdf(previewNode, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn-ghost";
    closeBtn.textContent = "Close";
    closeBtn.onclick = () => modal.classList.add("hidden");
    
    actions.appendChild(downloadBtn);
    actions.appendChild(closeBtn);
    modalCard.appendChild(actions);
    
    modal.classList.remove("hidden");
  } else {
    await generatePdf(previewNode, `${(student.name || "student").replace(/\s+/g, "_")}_profile.pdf`);
  }
}
