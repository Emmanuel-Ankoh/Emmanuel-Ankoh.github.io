const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Your Name' },
    headline: { type: String, default: 'Full-Stack Developer' },
    summary: { type: String, default: 'I build fast, accessible, and delightful web apps with clean code and solid engineering practices.' },
    avatarUrl: { type: String, default: '' },
    avatarPublicId: { type: String }
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
