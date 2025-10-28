const mongoose = require('mongoose');
const slugify = require('slugify');

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    githubUrl: { type: String },
    demoUrl: { type: String },
    tech: [{ type: String }],
    featured: { type: Boolean, default: false },
    slug: { type: String, unique: true, index: true }
  },
  { timestamps: true }
);

projectSchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Project', projectSchema);
