const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String
    },
    permissions: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

module.exports = mongoose.model('Role', RoleSchema);
