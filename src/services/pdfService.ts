import { jsPDF } from 'jspdf';

export const pdfService = {
  async generatePracticeSheet(records: any[]) {
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    // Header
    doc.setFontSize(22);
    doc.text('错题通：举一反三练习集', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`生成日期: ${new Date().toLocaleDateString()} | 题目总数: ${records.length}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    doc.setTextColor(0);

    records.forEach((record, recordIdx) => {
      // Check if we need a new page
      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
      }

      // Record Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`题目 ${recordIdx + 1} [${record.knowledgePoint}]`, margin, yPos);
      yPos += 8;

      // Original Question
      doc.setFontSize(11);
      doc.setFont('helvetica', 'italic');
      doc.text('【原题回顾】', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const originalLines = doc.splitTextToSize(record.originalText, contentWidth);
      doc.text(originalLines, margin, yPos);
      yPos += (originalLines.length * 6) + 10;

      // Variations
      doc.setFont('helvetica', 'bold');
      doc.text('【举一反三变式练习】', margin, yPos);
      yPos += 8;
      doc.setFont('helvetica', 'normal');

      record.variations.forEach((v: any, vIdx: number) => {
        if (yPos > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          yPos = 20;
        }
        const qText = `${vIdx + 1}. ${v.question}`;
        const qLines = doc.splitTextToSize(qText, contentWidth);
        doc.text(qLines, margin, yPos);
        yPos += (qLines.length * 6) + 6;
      });

      yPos += 10;
      doc.setDrawColor(230);
      doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
    });

    // Add Answer Key Page
    doc.addPage();
    yPos = 20;
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('答案与解析详见', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    records.forEach((record, recordIdx) => {
      doc.setFontSize(12);
      doc.text(`题目 ${recordIdx + 1} 答案解析`, margin, yPos);
      yPos += 10;

      record.variations.forEach((v: any, vIdx: number) => {
        if (yPos > doc.internal.pageSize.getHeight() - 40) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`变式 ${vIdx + 1}`, margin, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`答案: ${v.answer}`, margin + 5, yPos);
        yPos += 6;
        
        const analysisLines = doc.splitTextToSize(`解析: ${v.analysis}`, contentWidth - 5);
        doc.text(analysisLines, margin + 5, yPos);
        yPos += (analysisLines.length * 5) + 8;
      });
      
      yPos += 5;
    });

    doc.save(`错题练习_${new Date().getTime()}.pdf`);
  }
};
