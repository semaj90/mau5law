import { PDFDocument, rgb } from 'pdf-lib';

interface CaseData {
  id: string;
  title: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CaseNote {
  id: string;
  title: string | null;
  content: string;
  isAI: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EvidenceItem {
  id: string;
  title: string;
  type: string;
  fileName?: string;
  description?: string;
}

interface AIAnalysis {
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
}

export async function generateLegalPacketPDF(
  caseData: CaseData,
  notes: CaseNote[],
  evidence: EvidenceItem[],
  aiAnalysis?: AIAnalysis
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont('Helvetica');
  const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 40;
  const contentWidth = pageWidth - 2 * margin;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  const fontSize = 12;
  const headingSize = 16;
  const subheadingSize = 14;
  const lineHeight = fontSize + 4;

  // Helper function to add text with wrapping
  function addText(
    text: string,
    size: number,
    bold: boolean = false,
    color = rgb(0, 0, 0)
  ): number {
    const font = bold ? helveticaBold : helvetica;
    const lines = wrapText(text, size, font, contentWidth);

    for (const line of lines) {
      if (yPosition < margin + lineHeight) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      currentPage.drawText(line, {
        x: margin,
        y: yPosition,
        size,
        font,
        color,
      });

      yPosition -= lineHeight;
    }

    return yPosition;
  }

  // Helper function to wrap text
  function wrapText(text: string, fontSize: number, font: any, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  // Title Page
  yPosition = addText(`LEGAL CASE PACKET`, headingSize, true, rgb(0, 0, 0.5));
  yPosition -= lineHeight;
  yPosition = addText(`Case: ${caseData.title}`, subheadingSize, true);
  yPosition -= lineHeight * 0.5;
  yPosition = addText(`ID: ${caseData.id}`, fontSize);
  yPosition -= lineHeight;

  if (caseData.status) {
    yPosition = addText(`Status: ${caseData.status}`, fontSize);
    yPosition -= lineHeight;
  }

  if (caseData.createdAt) {
    yPosition = addText(
      `Created: ${new Date(caseData.createdAt).toLocaleDateString()}`,
      fontSize
    );
    yPosition -= lineHeight;
  }

  if (caseData.description) {
    yPosition -= lineHeight * 0.5;
    yPosition = addText(`Description:`, fontSize, true);
    yPosition = addText(caseData.description, fontSize);
  }

  // Case Notes Section
  yPosition -= lineHeight * 2;
  yPosition = addText(`CASE NOTES`, subheadingSize, true, rgb(0, 0, 0.5));
  yPosition -= lineHeight;

  if (notes.length === 0) {
    yPosition = addText('No notes available', fontSize);
  } else {
    for (const note of notes) {
      if (yPosition < margin + lineHeight * 3) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      // Note title
      const noteTitle = note.title || 'Untitled Note';
      yPosition = addText(noteTitle, fontSize, true);

      // Note metadata
      const metadata = `${new Date(note.updatedAt).toLocaleDateString()}${note.isAI ? ' [AI Generated]' : ''}${note.isPinned ? ' [Pinned]' : ''}`;
      yPosition = addText(metadata, fontSize - 2, false, rgb(0.5, 0.5, 0.5));

      // Note content (truncated to first 500 chars)
      const contentPreview = note.content.substring(0, 500);
      yPosition = addText(contentPreview, fontSize);

      if (note.content.length > 500) {
        yPosition = addText('[... content truncated ...]', fontSize - 2, false, rgb(0.7, 0.7, 0.7));
      }

      yPosition -= lineHeight;
    }
  }

  // Evidence Summary Section
  yPosition -= lineHeight * 2;
  yPosition = addText(`EVIDENCE SUMMARY`, subheadingSize, true, rgb(0, 0, 0.5));
  yPosition -= lineHeight;

  if (evidence.length === 0) {
    yPosition = addText('No evidence items', fontSize);
  } else {
    for (const item of evidence) {
      if (yPosition < margin + lineHeight * 2) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      yPosition = addText(`• ${item.title}`, fontSize, true);
      yPosition = addText(`  Type: ${item.type}`, fontSize - 1);

      if (item.fileName) {
        yPosition = addText(`  File: ${item.fileName}`, fontSize - 1);
      }

      if (item.description) {
        yPosition = addText(`  ${item.description}`, fontSize - 1);
      }

      yPosition -= lineHeight * 0.5;
    }
  }

  // AI Analysis Section
  if (aiAnalysis) {
    yPosition -= lineHeight * 2;
    yPosition = addText(`AI ANALYSIS`, subheadingSize, true, rgb(0, 0, 0.5));
    yPosition -= lineHeight;

    if (aiAnalysis.summary) {
      yPosition = addText(`Summary:`, fontSize, true);
      yPosition = addText(aiAnalysis.summary, fontSize);
      yPosition -= lineHeight;
    }

    if (aiAnalysis.keyFindings && aiAnalysis.keyFindings.length > 0) {
      yPosition = addText(`Key Findings:`, fontSize, true);
      for (const finding of aiAnalysis.keyFindings) {
        yPosition = addText(`• ${finding}`, fontSize);
      }
      yPosition -= lineHeight;
    }

    if (aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0) {
      yPosition = addText(`Recommendations:`, fontSize, true);
      for (const rec of aiAnalysis.recommendations) {
        yPosition = addText(`• ${rec}`, fontSize);
      }
    }
  }

  // Footer with generation timestamp
  yPosition = margin - lineHeight;
  const timestamp = new Date().toLocaleString();
  currentPage.drawText(`Generated: ${timestamp}`, {
    x: margin,
    y: yPosition,
    size: fontSize - 2,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}
