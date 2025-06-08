import nodemailer from 'nodemailer';
import fs from 'fs';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,        // your email
        pass: process.env.EMAIL_APP_PASSWORD // app password (not main password)
    }
});

export const sendAuditReportEmail = async (to, auditId, pdfPath) => {
    const mailOptions = {
        from: `'Wolf'`,
        to,
        subject: `Audit Report - ${auditId}`,
        text: `Your smart contract audit is complete. Attached is the report for audit ID: ${auditId}`,
        attachments: [
            {
                filename: `audit-${auditId}.pdf`,
                path: pdfPath
            }
        ]
    };

    await transporter.sendMail(mailOptions);
};
