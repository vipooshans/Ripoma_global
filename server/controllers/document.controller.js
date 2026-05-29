const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const DocumentActivity = require('../models/DocumentActivity');
const storage = require('../utils/storage');
const { generateDocNumber } = require('../utils/docNumberGenerator');
const { generateThumbnail } = require('../utils/thumbnailGenerator');
const { streamZipToResponse } = require('../utils/zipBuilder');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getExtension = (filename) => path.extname(filename).replace('.', '').toLowerCase();

const logActivity = async (documentId, docNumber, action, userId, ipAddress, details = '') => {
  try {
    await DocumentActivity.create({
      document: documentId,
      docNumber,
      action,
      performedBy: userId,
      ipAddress,
      details
    });
  } catch (err) {
    console.error('[DocumentController] Activity log error:', err.message);
  }
};

// ─── Upload ───────────────────────────────────────────────────────────────────

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const {
      name, category, description, tags, language,
      isConfidential, issueDate, expiryDate,
      linkedEntities
    } = req.body;

    const ext = getExtension(req.file.originalname);
    const docNumber = await generateDocNumber();
    const storageKey = `documents/${docNumber}/${uuidv4()}.${ext}`;

    // Upload primary file
    const { key, url } = await storage.upload(
      storageKey,
      req.file.buffer,
      req.file.mimetype,
      { originalFilename: req.file.originalname, uploadedBy: req.user._id.toString() }
    );

    // Generate & upload thumbnail
    let thumbnailKey = null;
    const thumbBuffer = await generateThumbnail(req.file.buffer, req.file.mimetype);
    if (thumbBuffer) {
      const thumbKey = `documents/${docNumber}/thumb_${uuidv4()}.jpg`;
      await storage.upload(thumbKey, thumbBuffer, 'image/jpeg');
      thumbnailKey = thumbKey;
    }

    // Parse linked entities
    let parsedLinks = [];
    if (linkedEntities) {
      try {
        parsedLinks = typeof linkedEntities === 'string'
          ? JSON.parse(linkedEntities)
          : linkedEntities;
      } catch (_) { /* ignore malformed links */ }
    }

    // Parse tags
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string'
        ? tags.split(',').map(t => t.trim()).filter(Boolean)
        : tags;
    }

    const doc = await Document.create({
      docNumber,
      name: name || req.file.originalname,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      extension: ext,
      sizeBytes: req.file.size,
      category: category || 'other',
      tags: parsedTags,
      description,
      language: language || 'en',
      isConfidential: isConfidential === 'true' || isConfidential === true,
      storageKey: key,
      storageUrl: url,
      thumbnailKey,
      linkedEntities: parsedLinks,
      issueDate: issueDate || null,
      expiryDate: expiryDate || null,
      uploadedBy: req.user._id
    });

    await logActivity(doc._id, docNumber, 'uploaded', req.user._id, req.ip,
      `Uploaded "${doc.name}" (${(doc.sizeBytes / 1024).toFixed(1)} KB)`);

    const populated = await Document.findById(doc._id).populate('uploadedBy', 'firstName lastName email');
    res.status(201).json({ message: 'Document uploaded successfully', document: populated });
  } catch (err) {
    console.error('[DocumentController] Upload error:', err);
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

// ─── List / Search ────────────────────────────────────────────────────────────

exports.getDocuments = async (req, res) => {
  try {
    const {
      page = 1, limit = 12,
      search, category, tags, isConfidential,
      isExpired, uploadedBy,
      entityType, entityId,
      sort = 'uploadedAt:desc'
    } = req.query;

    const filter = { isDeleted: false };

    if (search) {
      filter.$text = { $search: search };
    }
    if (category) filter.category = category;
    if (isConfidential !== undefined) filter.isConfidential = isConfidential === 'true';
    if (isExpired !== undefined) filter.isExpired = isExpired === 'true';
    if (uploadedBy) filter.uploadedBy = uploadedBy;
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      filter.tags = { $in: tagList };
    }
    if (entityType && entityId) {
      filter['linkedEntities.entityType'] = entityType;
      filter['linkedEntities.entityId'] = entityId;
    }

    const [sortField, sortDir] = sort.split(':');
    const sortObj = { [sortField]: sortDir === 'asc' ? 1 : -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      Document.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'firstName lastName'),
      Document.countDocuments(filter)
    ]);

    res.json({
      documents: docs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('[DocumentController] List error:', err);
    res.status(500).json({ message: 'Failed to fetch documents', error: err.message });
  }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalDocs,
      totalSizeResult,
      expiredDocs,
      expiringDocs,
      recentUploads,
      categoryBreakdown,
      uploadTrend,
      recentActivity
    ] = await Promise.all([
      Document.countDocuments({ isDeleted: false }),
      Document.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$sizeBytes' } } }
      ]),
      Document.countDocuments({ isDeleted: false, isExpired: true }),
      Document.countDocuments({
        isDeleted: false,
        isExpired: false,
        expiryDate: { $gt: now, $lte: thirtyDaysFromNow }
      }),
      Document.find({ isDeleted: false })
        .sort({ uploadedAt: -1 })
        .limit(5)
        .populate('uploadedBy', 'firstName lastName'),
      Document.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$sizeBytes' } } },
        { $sort: { count: -1 } }
      ]),
      Document.aggregate([
        {
          $match: {
            isDeleted: false,
            uploadedAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$uploadedAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      require('../models/DocumentActivity')
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('performedBy', 'firstName lastName')
        .populate('document', 'name docNumber')
    ]);

    const totalStorageBytes = totalSizeResult[0]?.total || 0;

    // Find documents expiring soon
    const expiringDocsList = await Document.find({
      isDeleted: false,
      isExpired: false,
      expiryDate: { $gt: now, $lte: thirtyDaysFromNow }
    })
      .sort({ expiryDate: 1 })
      .limit(5)
      .populate('uploadedBy', 'firstName lastName');

    res.json({
      kpis: {
        totalDocuments: totalDocs,
        totalStorageBytes,
        expiredDocuments: expiredDocs,
        expiringIn30Days: expiringDocs
      },
      categoryBreakdown,
      uploadTrend,
      recentUploads,
      expiringDocsList,
      recentActivity
    });
  } catch (err) {
    console.error('[DocumentController] Dashboard error:', err);
    res.status(500).json({ message: 'Failed to load dashboard', error: err.message });
  }
};

// ─── Single Document ──────────────────────────────────────────────────────────

exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false })
      .populate('uploadedBy', 'firstName lastName email role')
      .populate('previousVersions.uploadedBy', 'firstName lastName');

    if (!doc) return res.status(404).json({ message: 'Document not found' });

    // Log view
    await logActivity(doc._id, doc.docNumber, 'viewed', req.user._id, req.ip);

    res.json(doc);
  } catch (err) {
    console.error('[DocumentController] Get by ID error:', err);
    res.status(500).json({ message: 'Failed to fetch document', error: err.message });
  }
};

// ─── Download (presigned URL) ─────────────────────────────────────────────────

exports.downloadDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const url = await storage.getPresignedUrl(doc.storageKey, 900);

    // Update download stats
    await Document.findByIdAndUpdate(doc._id, {
      $inc: { downloadCount: 1 },
      lastDownloadedAt: new Date(),
      lastDownloadedBy: req.user._id
    });

    await logActivity(doc._id, doc.docNumber, 'downloaded', req.user._id, req.ip,
      `Downloaded "${doc.name}"`);

    res.json({ url, filename: doc.originalFilename, expiresIn: 900 });
  } catch (err) {
    console.error('[DocumentController] Download error:', err);
    res.status(500).json({ message: 'Failed to generate download URL', error: err.message });
  }
};

// ─── Bulk Download ────────────────────────────────────────────────────────────

exports.bulkDownload = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ message: 'No document IDs provided' });

    const docs = await Document.find({ _id: { $in: ids }, isDeleted: false });
    if (!docs.length) return res.status(404).json({ message: 'No documents found' });

    const files = docs.map(d => ({ key: d.storageKey, filename: d.originalFilename }));
    streamZipToResponse(files, res);

    // Log downloads
    for (const doc of docs) {
      await logActivity(doc._id, doc.docNumber, 'downloaded', req.user._id, req.ip, 'Bulk download');
    }
  } catch (err) {
    console.error('[DocumentController] Bulk download error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Bulk download failed', error: err.message });
  }
};

// ─── Update Metadata ──────────────────────────────────────────────────────────

exports.updateDocument = async (req, res) => {
  try {
    const { name, category, description, tags, isConfidential, issueDate, expiryDate, linkedEntities } = req.body;

    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (isConfidential !== undefined) updates.isConfidential = isConfidential;
    if (issueDate !== undefined) updates.issueDate = issueDate || null;
    if (expiryDate !== undefined) {
      updates.expiryDate = expiryDate || null;
      if (expiryDate) {
        updates.isExpired = new Date(expiryDate) <= new Date();
        updates.expiryAlertSent = false;
      }
    }
    if (linkedEntities !== undefined) {
      updates.linkedEntities = typeof linkedEntities === 'string'
        ? JSON.parse(linkedEntities)
        : linkedEntities;
    }

    const updated = await Document.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('uploadedBy', 'firstName lastName email');

    await logActivity(doc._id, doc.docNumber, 'renamed', req.user._id, req.ip,
      `Updated metadata for "${doc.name}"`);

    res.json({ message: 'Document updated', document: updated });
  } catch (err) {
    console.error('[DocumentController] Update error:', err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

// ─── New Version Upload ───────────────────────────────────────────────────────

exports.uploadNewVersion = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const { changeNote } = req.body;
    const ext = getExtension(req.file.originalname);
    const newKey = `documents/${doc.docNumber}/v${doc.version + 1}_${uuidv4()}.${ext}`;

    // Upload new version
    const { key: newStorageKey } = await storage.upload(newKey, req.file.buffer, req.file.mimetype);

    // Generate thumbnail for new version
    let thumbnailKey = doc.thumbnailKey;
    const thumbBuffer = await generateThumbnail(req.file.buffer, req.file.mimetype);
    if (thumbBuffer) {
      const thumbKey = `documents/${doc.docNumber}/thumb_v${doc.version + 1}_${uuidv4()}.jpg`;
      await storage.upload(thumbKey, thumbBuffer, 'image/jpeg');
      thumbnailKey = thumbKey;
    }

    // Archive previous version
    const previousVersion = {
      version: doc.version,
      storageKey: doc.storageKey,
      uploadedBy: doc.uploadedBy,
      uploadedAt: doc.uploadedAt,
      changeNote: changeNote || ''
    };

    const updated = await Document.findByIdAndUpdate(
      doc._id,
      {
        $inc: { version: 1 },
        storageKey: newStorageKey,
        mimeType: req.file.mimetype,
        extension: ext,
        sizeBytes: req.file.size,
        originalFilename: req.file.originalname,
        thumbnailKey,
        $push: { previousVersions: previousVersion }
      },
      { new: true }
    ).populate('uploadedBy', 'firstName lastName email');

    await logActivity(doc._id, doc.docNumber, 'version_added', req.user._id, req.ip,
      `Version ${updated.version} uploaded. ${changeNote || ''}`);

    res.json({ message: `Version ${updated.version} uploaded`, document: updated });
  } catch (err) {
    console.error('[DocumentController] Version upload error:', err);
    res.status(500).json({ message: 'Version upload failed', error: err.message });
  }
};

// ─── Soft Delete ──────────────────────────────────────────────────────────────

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    await Document.findByIdAndUpdate(doc._id, { isDeleted: true });

    await logActivity(doc._id, doc.docNumber, 'deleted', req.user._id, req.ip,
      `Soft-deleted "${doc.name}"`);

    res.json({ message: 'Document deleted' });
  } catch (err) {
    console.error('[DocumentController] Delete error:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

// ─── Restore ─────────────────────────────────────────────────────────────────

exports.restoreDocument = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: true });
    if (!doc) return res.status(404).json({ message: 'Document not found or not deleted' });

    await Document.findByIdAndUpdate(doc._id, { isDeleted: false });

    await logActivity(doc._id, doc.docNumber, 'restored', req.user._id, req.ip,
      `Restored "${doc.name}"`);

    res.json({ message: 'Document restored' });
  } catch (err) {
    console.error('[DocumentController] Restore error:', err);
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
};

// ─── Thumbnail ────────────────────────────────────────────────────────────────

exports.getThumbnail = async (req, res) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc || !doc.thumbnailKey) return res.status(404).json({ message: 'Thumbnail not available' });

    const url = await storage.getPresignedUrl(doc.thumbnailKey, 3600);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get thumbnail', error: err.message });
  }
};
