import { jsPDF } from "jspdf";

export interface UserDonation {
  id: string;
  amount: number;
  paymentMethod: string;
  date: string;
  notes?: string;
  userName?: string;
  userEmail?: string;
  userId?: string;
}

export function generateReceiptPDF(donation: UserDonation) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5", // Elegant small certificate size!
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Draw elegant background framing border (Islamic accent style)
  doc.setDrawColor(1, 45, 29); // Primary Deep Emerald: #012d1d
  doc.setLineWidth(1.5);
  doc.rect(5, 5, width - 10, height - 10);

  doc.setDrawColor(186, 145, 19); // Highlight Gold Accent: #BA9113
  doc.setLineWidth(0.5);
  doc.rect(7, 7, width - 14, height - 14);

  // Decorative corners
  const drawCornerDesign = (x: number, y: number, r: number) => {
    doc.line(x - r, y, x + r, y);
    doc.line(x, y - r, x, y + r);
  };
  drawCornerDesign(7, 7, 3);
  drawCornerDesign(width - 7, 7, 3);
  drawCornerDesign(7, height - 7, 3);
  drawCornerDesign(width - 7, height - 7, 3);

  // Logo Placeholder / Brand Name
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(1, 45, 29); // Deep Emerald
  doc.text("Shahadat Masjid", width / 2, 22, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(186, 145, 19); // Gold
  doc.text("SADAKAH PORTAL • CONTRIBUTION RECEIPT (सहयोग रसीद)", width / 2, 28, { align: "center" });

  // Divider line
  doc.setDrawColor(1, 45, 29);
  doc.setLineWidth(0.5);
  doc.line(15, 34, width - 15, 34);

  // Receipt details header
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(`Receipt No: ${donation.id}`, 15, 41);
  doc.text(`Date: ${donation.date}`, width - 15, 41, { align: "right" });

  // Draw main info box
  doc.setFillColor(248, 250, 248); // ultra-soft green tint background
  doc.rect(15, 46, width - 30, 68, "F");
  doc.setDrawColor(220, 225, 220);
  doc.setLineWidth(0.2);
  doc.rect(15, 46, width - 30, 68);

  const startY = 53;
  const col1X = 20;
  const col2X = 54;

  // Metadata items
  const items = [
    { label: "Donor Name", value: donation.userName || "Faithful Donor" },
    { label: "Email Address", value: donation.userEmail || "N/A" },
    { label: "Payment Route", value: donation.paymentMethod || "Direct Bank Transfer" },
    { label: "Amount", value: `NPR Rs. ${donation.amount.toLocaleString()}`, highlight: true },
  ];

  items.forEach((item, index) => {
    const currentLineY = startY + (index * 8.5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(item.label, col1X, currentLineY);

    if (item.highlight) {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(1, 45, 29); // Rich Emerald green
    } else {
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
    }
    doc.text(item.value, col2X, currentLineY);
  });

  // Notes / Du'as / Remarks block inside the box
  const notesY = startY + (items.length * 8.5);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Remarks / Dua", col1X, notesY);

  doc.setFont("Helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const rawNotes = donation.notes ? `"${donation.notes}"` : "May Allah accept this humble contribution.";
  const splitNotes = doc.splitTextToSize(rawNotes, width - col2X - 5);
  doc.text(splitNotes, col2X, notesY);

  // Certification / Seal / Signature section
  const footerStartY = 124;
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(1, 45, 29);
  doc.text("Jazakallahu Khairan (जजाकल्लाह खैरान)", width / 2, footerStartY, { align: "center" });

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Your support assists local community welfare programs,", width / 2, footerStartY + 4.5, { align: "center" });
  doc.text("Islamic studies, and essential masjid utility operations.", width / 2, footerStartY + 8, { align: "center" });

  // Small beautiful signature line at the right bottom
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(width - 45, height - 25, width - 15, height - 25);
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text("Authorized Signature", width - 30, height - 21, { align: "center" });

  // Standard verified watermarked stamp text
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(186, 145, 19);
  doc.text("OFFICIAL SECURE RECEIPT", 20, height - 21);

  // Trigger Save
  doc.save(`Shahadat_Masjid_Receipt_${donation.id}.pdf`);
}
