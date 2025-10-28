const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Your Name' },
    headline: { type: String, default: 'Full-Stack Developer' },
    summary: { type: String, default: 'I build fast, accessible, and delightful web apps with clean code and solid engineering practices.' },
    avatarUrl: { type: String, default: '' },
    avatarPublicId: { type: String },
    resumeUrl: { type: String, default: '/resume.pdf' },
    contactIntro: { type: String, default: 'Feel free to reach out for collaborations or just a friendly hello.' },
    socials: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      email: { type: String, default: '' }
    },
    homeCta: {
      primaryText: { type: String, default: 'View Projects' },
      primaryUrl: { type: String, default: '/projects' },
      secondaryText: { type: String, default: 'Get in Touch' },
      secondaryUrl: { type: String, default: '/contact' }
    },
    aboutBody: { type: String, default: '' },
    timeline: [
      {
        year: String,
        title: String,
        subtitle: String,
        description: String
      }
    ],
    skills: [
      {
        name: String,
        level: Number
      }
    ]
  },
  { timestamps: true }
);

settingsSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) doc = await this.create({});
  return doc;
};

module.exports = mongoose.model('Settings', settingsSchema);
