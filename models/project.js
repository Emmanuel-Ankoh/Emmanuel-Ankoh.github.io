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
    year: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    slug: { type: String, unique: true, index: true }
  },
  { timestamps: true }
);

projectSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('title') && this.slug) return next();
    const base = slugify(this.title || '', { lower: true, strict: true });
    const baseSlug = base || (this._id ? this._id.toString() : Date.now().toString(36));
    let candidate = baseSlug;
    let counter = 1;
    const Model = this.constructor;
    while (await Model.exists({ slug: candidate, _id: { $ne: this._id } })) {
      candidate = `${baseSlug}-${counter++}`;
    }
    this.slug = candidate;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Project', projectSchema);
