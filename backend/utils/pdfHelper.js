import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const generateAuditPDF = async (auditId, auditJson) => {
  if (typeof auditJson === 'string') {
    auditJson = JSON.parse(auditJson);
  }

  const filePath = path.resolve(`./audit-${auditId}.pdf`);

  const htmlContent = `
    <html>
    <head>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { color: #2d3748; }
        .item { margin-bottom: 20px; padding: 10px; border: 1px solid #ccc; }
        .severity { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Audit Report - ${auditId}</h1>
      ${auditJson.map(item => `
        <div class="item">
          <p><span class="severity">${item.severity.toUpperCase()}</span> - Line ${item.line}</p>
          <p><strong>Issue:</strong> ${item.issue}</p>
          <p><strong>Recommendation:</strong> ${item.recommendation}</p>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: filePath, format: 'A4' });
  await browser.close();

  return filePath;
};
