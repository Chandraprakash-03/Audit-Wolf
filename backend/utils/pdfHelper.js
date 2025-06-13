import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export const generateAuditPDF = async (auditId, auditData) => {
  const { vulnerabilities, gasOptimizations } = auditData;

  const filePath = path.resolve(`./audit-${auditId}.pdf`);

  const htmlContent = `
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          padding: 30px; 
          color: #2d3748;
          line-height: 1.6;
        }
        h1 { 
          color: #1a202c; 
          text-align: center;
          margin-bottom: 30px;
        }
        h2 { 
          color: #2b6cb0; 
          margin-top: 40px;
          margin-bottom: 20px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 5px;
        }
        .item { 
          margin-bottom: 20px; 
          padding: 15px; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          background-color: #f7fafc;
        }
        .severity { 
          font-weight: bold; 
          padding: 4px 8px; 
          border-radius: 4px;
          display: inline-block;
        }
        .severity-critical { background-color: #fed7d7; color: #c53030; }
        .severity-high { background-color: #feebc8; color: #c05621; }
        .severity-medium { background-color: #fefcbf; color: #b7791f; }
        .severity-low { background-color: #bee3f8; color: #2b6cb0; }
        .label { 
          font-weight: bold; 
          color: #4a5568;
          margin-right: 5px;
        }
        .gas-info { 
          margin-bottom: 20px; 
          padding: 10px; 
          background-color: #e6fffa; 
          border-radius: 8px;
        }
      </style>
    </head>
    <body>
      <h1>Audit Report - ${auditId}</h1>

      <h2>Vulnerabilities</h2>
      ${vulnerabilities.length > 0 ? vulnerabilities.map(item => `
        <div class="item">
          <p><span class="severity severity-${item.severity.toLowerCase()}">${item.severity.toUpperCase()}</span> - Line ${item.line}</p>
          <p><span class="label">Issue:</span> ${item.issue}</p>
          <p><span class="label">Recommendation:</span> ${item.recommendation}</p>
        </div>
      `).join('') : '<p>No vulnerabilities found.</p>'}

      <h2>Gas Optimizations</h2>
      <div class="gas-info">
        <p><span class="label">Estimated Gas Usage:</span> ${gasOptimizations.estimatedGas.toLocaleString()} gas</p>
      </div>
      ${gasOptimizations.suggestions.length > 0 ? gasOptimizations.suggestions.map(item => `
        <div class="item">
          <p><span class="label">Line ${item.line}:</span> ${item.description}</p>
          <p><span class="label">Estimated Savings:</span> ${item.estimatedSavings.toLocaleString()} gas</p>
        </div>
      `).join('') : '<p>No gas optimization suggestions found.</p>'}
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.pdf({ path: filePath, format: 'A4', margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } });
  await browser.close();

  return filePath;
};