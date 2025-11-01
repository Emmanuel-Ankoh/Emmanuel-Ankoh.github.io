const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Your Name' },
    headline: { type: String, default: 'Full-Stack Developer' },
    summary: { type: String, default: 'I build fast, accessible, and delightful web apps with clean code and solid engineering practices.' },
  mission: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    avatarPublicId: { type: String },
    resumeUrl: { type: String, default: '/resume.pdf' },
    contactIntro: { type: String, default: 'Feel free to reach out for collaborations or just a friendly hello.' },
  location: { type: String, default: '' },
  phone: { type: String, default: '' },
  availability: { type: Boolean, default: true },
    homeCopy: {
      heroGreeting: { type: String, default: 'Hi, I\'m' },
      heroHighlight: { type: String, default: 'elegant digital experiences' },
      heroStatement: { type: String, default: 'I craft elegant digital experiences that deliver measurable impact.' },
      heroSecondaryTitle: { type: String, default: 'Currently focused on' },
      heroSecondaryItems: {
        type: [
        {
          label: { type: String, trim: true },
          value: { type: String, trim: true }
        }
        ],
        default: []
      },
      capabilitiesHeading: { type: String, default: 'What I bring to every engagement' },
      capabilitiesLead: { type: String, default: 'Human-centered thinking, meticulous execution, and a collaborative spirit that keeps projects moving swiftly from concept to launch.' },
      experienceHeading: { type: String, default: 'Strategic engineering, thoughtful design' },
      experienceLead: { type: String, default: 'I help product teams transform ambitious ideas into polished products, combining robust architecture with moments of delight that users remember.' },
      timelineHeading: { type: String, default: 'Recent milestones' },
      timelineLead: { type: String, default: '' },
      skillsHeading: { type: String, default: 'Toolkit' },
      skillsLead: { type: String, default: '' },
      featureHeading: { type: String, default: 'Selected work that blends craft and conversion' },
      featureLead: { type: String, default: 'Each project pairs elegant UI with resilient engineering to launch faster and perform longer.' },
  testimonialsHeading: { type: String, default: 'Trusted by collaborators & clients' },
  testimonialsLead: { type: String, default: 'Relationships thrive on clarity, reliability, and consistent delivery - that\'s the foundation of every engagement.' },
  notesHeading: { type: String, default: 'Latest thinking from the notebook' },
      notesLead: { type: String, default: 'Short notes, deep dives, and resources that explore the craft of building modern products.' },
  closingHeading: { type: String, default: 'Let\'s build the next standout experience' },
  closingLead: { type: String, default: 'Feel free to reach out for collaborations or just a friendly hello.' },
      closingPrimaryText: { type: String, default: 'Start a project' },
      closingPrimaryUrl: { type: String, default: '/contact' },
      closingSecondaryText: { type: String, default: 'Email directly' },
      closingSecondaryUrl: { type: String, default: '' }
    },
    socials: {
      github: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      twitter: { type: String, default: '' },
      instagram: { type: String, default: '' },
      youtube: { type: String, default: '' },
      stackoverflow: { type: String, default: '' },
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
    ],
    skillGroups: [
      {
        title: { type: String, trim: true },
        skills: [
          {
            name: { type: String, trim: true },
            level: Number
          }
        ]
      }
    ],
    testimonials: [
      {
        name: { type: String, trim: true },
        role: { type: String, trim: true },
        quote: { type: String, trim: true },
        avatarUrl: { type: String, trim: true },
        link: { type: String, trim: true }
      }
    ],
    notes: [
      {
        title: { type: String, trim: true },
        url: { type: String, trim: true },
        summary: { type: String, trim: true },
        date: { type: String, trim: true }
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
