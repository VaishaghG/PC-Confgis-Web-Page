const mongoose = require('mongoose');

const pcBuildSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: '' }, // optional build nickname
    cpu: { type: String, default: '' },
    gpu: { type: String, default: '' },
    ram: { type: String, default: '' },
    storage: { type: String, default: '' },
    cabinet: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'saved'], default: 'draft' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PCBuild', pcBuildSchema, 'pcbuilds');
