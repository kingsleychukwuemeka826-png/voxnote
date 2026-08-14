import jsPDF from 'jspdf';
import { Note } from '../types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'note';
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

/**
 * Generate formatted Markdown string for a note
 */
export function generateNoteMarkdown(note: Note): string {
  const dateStr = formatDate(note.createdAt);
  const tagsStr = note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'None';
  
  let md = `# ${note.title}\n\n`;
  md += `**Date:** ${dateStr}  \n`;
  md += `**Type:** ${note.type.toUpperCase()} Note  \n`;
  md += `**Tags:** ${tagsStr}  \n`;
  if (note.sentiment) {
    md += `**Sentiment:** ${note.sentiment}  \n`;
  }
  md += `\n---\n\n`;

  if (note.summary) {
    md += `## 🤖 AI Executive Summary\n\n${note.summary}\n\n`;
  }

  if (note.keyTakeaways && note.keyTakeaways.length > 0) {
    md += `## 💡 Key Insights\n\n`;
    note.keyTakeaways.forEach((insight) => {
      md += `- ${insight}\n`;
    });
    md += `\n`;
  }

  if (note.actionItems && note.actionItems.length > 0) {
    md += `## 🎯 Action Items\n\n`;
    note.actionItems.forEach((item) => {
      md += `- [${item.completed ? 'x' : ' '}] ${item.text}\n`;
    });
    md += `\n`;
  }

  md += `## 📝 Full Content & Transcript\n\n${note.content}\n`;

  return md;
}

/**
 * Export a single note as a Markdown (.md) file download
 */
export function exportNoteAsMarkdown(note: Note) {
  const content = generateNoteMarkdown(note);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(note.title)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export multiple notes as a single consolidated Markdown (.md) file download
 */
export function exportNotesAsConsolidatedMarkdown(notes: Note[], filenameHint = 'all_exported_notes') {
  if (notes.length === 0) return;
  
  let combinedMd = `# Exported Notes Collection (${notes.length} Notes)\n`;
  combinedMd += `*Generated on ${new Date().toLocaleDateString()}*\n\n=========================================\n\n`;

  notes.forEach((note, idx) => {
    combinedMd += `### Note #${idx + 1}\n\n`;
    combinedMd += generateNoteMarkdown(note);
    combinedMd += `\n\n=========================================\n\n`;
  });

  const blob = new Blob([combinedMd], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(filenameHint)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a note as a cleanly formatted PDF file using jsPDF
 */
export function exportNoteAsPdf(note: Note) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(margin, y, contentWidth, 4, 'F');
  y += 18;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate 900
  const titleLines = doc.splitTextToSize(note.title, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 24;

  // Sub-header Metadata
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  const metaText = `Date: ${formatDate(note.createdAt)}  |  Type: ${note.type.toUpperCase()}  |  Tags: ${note.tags.join(', ') || 'None'}`;
  doc.text(metaText, margin, y);
  y += 20;

  // Divider Line
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.75);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Executive Summary Box
  if (note.summary) {
    checkPageBreak(80);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(67, 56, 202); // Indigo 700
    doc.text('AI EXECUTIVE SUMMARY', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate 700
    const summaryLines = doc.splitTextToSize(note.summary, contentWidth - 20);

    const boxPadding = 10;
    const boxHeight = summaryLines.length * 14 + boxPadding * 2;

    doc.setFillColor(245, 247, 255); // Indigo 50 background
    doc.roundedRect(margin, y, contentWidth, boxHeight, 6, 6, 'F');

    doc.text(summaryLines, margin + boxPadding, y + boxPadding + 10);
    y += boxHeight + 20;
  }

  // Key Insights
  if (note.keyTakeaways && note.keyTakeaways.length > 0) {
    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('KEY INSIGHTS', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    note.keyTakeaways.forEach((takeaway) => {
      const bulletLines = doc.splitTextToSize(`• ${takeaway}`, contentWidth - 10);
      checkPageBreak(bulletLines.length * 13);
      doc.text(bulletLines, margin + 5, y);
      y += bulletLines.length * 13 + 4;
    });

    y += 12;
  }

  // Action Items
  if (note.actionItems && note.actionItems.length > 0) {
    checkPageBreak(50);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('ACTION ITEMS', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    note.actionItems.forEach((item) => {
      const symbol = item.completed ? '[X]' : '[  ]';
      const itemText = `${symbol}  ${item.text}`;
      const lines = doc.splitTextToSize(itemText, contentWidth - 10);
      checkPageBreak(lines.length * 13);

      if (item.completed) {
        doc.setTextColor(148, 163, 184); // Slate 400
      } else {
        doc.setTextColor(30, 41, 59); // Slate 800
      }

      doc.text(lines, margin + 5, y);
      y += lines.length * 13 + 4;
    });

    y += 16;
  }

  // Full Content / Transcript
  if (note.content) {
    checkPageBreak(60);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('FULL TRANSCRIPTION & NOTES', margin, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const contentLines = doc.splitTextToSize(note.content, contentWidth);
    
    contentLines.forEach((line: string) => {
      checkPageBreak(12);
      doc.text(line, margin, y);
      y += 12;
    });
  }

  // Footer on all pages
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by Voxnote  |  Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 20
    );
  }

  doc.save(`${slugify(note.title)}.pdf`);
}

/**
 * Share note using Web Share API or copy link/text fallback
 */
export async function shareNoteNative(note: Note): Promise<'shared' | 'copied'> {
  const shareText = `# ${note.title}\n\n${note.summary}\n\nKey Takeaways:\n${(note.keyTakeaways || []).join('\n')}`;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: note.title,
        text: shareText,
      });
      return 'shared';
    } catch (e) {
      // User cancelled share or not supported
    }
  }

  await navigator.clipboard.writeText(shareText);
  return 'copied';
}
