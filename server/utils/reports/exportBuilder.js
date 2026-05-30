const nodemailer = require('nodemailer');
const storageAdapter = require('../storage');
const ReportExport = require('../../models/ReportExport');
const buildCsv = require('./builders/CsvBuilder');
const buildXlsx = require('./builders/XlsxBuilder');
const buildPdf = require('./builders/PdfBuilder');
const { v4: uuidv4 } = require('uuid');

/**
 * Resolves SMTP or Mock JSON transporter
 */
const getTransporter = () => {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    return nodemailer.createTransport({
      jsonTransport: true
    });
  }
};

/**
 * Triggers document export generation, storage upload, registry saving, and email delivery.
 * 
 * @param {object} params
 * @param {string} [params.exportRecordId] - Existing pending export ID to update
 * @param {string} [params.reportDefinitionId] - Saved report template ID
 * @param {string} [params.scheduledReportId] - Linked schedule ID
 * @param {string} params.name - Filename title
 * @param {string} params.type - Report category
 * @param {'csv'|'xlsx'|'pdf'} params.format - Target format extension
 * @param {string[]} params.columns - Target columns list
 * @param {object[]} params.data - Results dataset
 * @param {string} [params.generatedBy] - User ID
 * @param {object[]} [params.recipients] - Recipients list for scheduled reports
 * @returns {Promise<object>} The resolved ready ReportExport document
 */
const generateExport = async ({
  exportRecordId = null,
  reportDefinitionId = null,
  scheduledReportId = null,
  name,
  type,
  format,
  columns,
  data,
  generatedBy = null,
  recipients = []
}) => {
  try {
    let builderResult;
    
    // 1. Invoke the Strategy Builder
    if (format === 'csv') {
      builderResult = await buildCsv(columns, data);
    } else if (format === 'xlsx') {
      builderResult = await buildXlsx(columns, data, name);
    } else if (format === 'pdf') {
      // Create period date string for display (default to past 30 days label if not provided)
      const dateRangeStr = 'Trailing Activity Period';
      builderResult = await buildPdf(columns, data, name, dateRangeStr);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const { buffer, mimeType } = builderResult;

    // 2. Upload file to active Storage adapter (Local or S3)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileId = uuidv4();
    const key = `reports/${year}/${month}/${fileId}.${format}`;

    await storageAdapter.upload(key, buffer, mimeType);

    // 3. Update or Create the ReportExport log record
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // Expires in 72h (presigned URL timeout)
    
    let exportRecord;
    if (exportRecordId) {
      exportRecord = await ReportExport.findById(exportRecordId);
    }

    const updateFields = {
      name,
      type,
      format,
      status: 'ready',
      storageKey: key,
      fileSizeBytes: buffer.length,
      rowCount: data.length,
      expiresAt
    };

    if (reportDefinitionId) updateFields.reportDefinition = reportDefinitionId;
    if (scheduledReportId) updateFields.scheduledReport = scheduledReportId;
    if (generatedBy) updateFields.generatedBy = generatedBy;

    if (exportRecord) {
      Object.assign(exportRecord, updateFields);
      await exportRecord.save();
    } else {
      exportRecord = await ReportExport.create(updateFields);
    }

    // 4. If scheduled, email recipients
    if (recipients && recipients.length > 0) {
      const transporter = getTransporter();
      const emails = recipients.map(r => r.email).filter(Boolean);
      
      if (emails.length > 0) {
        // Generate a presigned download URL for references
        const downloadUrl = await storageAdapter.getPresignedUrl(key, 72 * 60 * 60);

        const emailOptions = {
          from: '"RIPOMA GLOBAL Intelligence" <noreply@ripomaglobal.com>',
          to: emails.join(', '),
          subject: `RIPOMA Scheduled Report: ${name}`,
          text: `Hello,\n\nPlease find attached the scheduled operational report "${name}" generated on ${new Date().toLocaleString()}.\n\nIf you have issues opening the attachment, you can also download the file directly using the secure link below (active for 72 hours):\n${downloadUrl}\n\nBest regards,\nRIPOMA GLOBAL Systems`
        };

        // Attach file directly if size is under 5MB limit
        if (buffer.length < 5 * 1024 * 1024) {
          emailOptions.attachments = [
            {
              filename: `${name.toLowerCase().replace(/\s+/g, '_')}.${format}`,
              content: buffer
            }
          ];
        } else {
          emailOptions.text += `\n\n(Note: The report file exceeds 5MB and could not be attached directly to this email.)`;
        }

        await transporter.sendMail(emailOptions);
        console.log(`[EMAIL] Scheduled report "${name}" successfully mailed to: ${emails.join(', ')}`);
      }
    }

    return exportRecord;
  } catch (error) {
    console.error(`[EXPORT ERROR] Failed to generate export for: ${name}`, error);
    
    // Flag the record as failed if possible
    if (exportRecordId) {
      try {
        await ReportExport.findByIdAndUpdate(exportRecordId, { status: 'failed' });
      } catch (dbErr) {
        console.error('Failed to update export error status:', dbErr);
      }
    }
    throw error;
  }
};

module.exports = { generateExport };
