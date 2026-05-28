const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String },
    icon: { type: String }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Category', CategorySchema);
