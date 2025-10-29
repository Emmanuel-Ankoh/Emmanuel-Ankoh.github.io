/*
 * Script: backfill-project-slugs.js
 * Purpose: Ensures every Project document has a unique slug derived from its title.
 * Usage: npm run backfill:slugs
 */

require('dotenv').config();

const mongoose = require('mongoose');
const slugify = require('slugify');
const path = require('path');

// Ensure models can be resolved regardless of execution directory
const Project = require(path.join(__dirname, '..', 'models', 'project'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/portfolio';

async function connect() {
  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });
}

function buildSlug(base) {
  return slugify(base, { lower: true, strict: true, trim: true });
}

async function ensureUniqueSlug(project, baseSlug) {
  let candidate = baseSlug || 'project';
  let suffix = 1;
  const idFilter = { $ne: project._id };

  // If slug already unique, return existing slug to avoid rewriting unnecessarily
  if (project.slug) {
    const exists = await Project.exists({ slug: project.slug, _id: idFilter });
    if (!exists) return project.slug;
  }

  // Start from base; if empty (e.g., blank title) fallback to project
  if (!candidate) candidate = 'project';

  let uniqueSlug = candidate;
  // Keep probing until slug is unique across collection
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const conflict = await Project.exists({ slug: uniqueSlug, _id: idFilter });
    if (!conflict) return uniqueSlug;
    uniqueSlug = `${candidate}-${suffix++}`;
  }
}

async function backfill() {
  const projects = await Project.find().sort({ updatedAt: -1 });
  if (!projects.length) {
    console.log('No projects found. Nothing to do.');
    return;
  }
  let touched = 0;

  for (const project of projects) {
    const baseSlug = project.title ? buildSlug(project.title) : '';
    const desiredSlug = await ensureUniqueSlug(project, baseSlug);
    if (project.slug !== desiredSlug) {
      project.slug = desiredSlug;
      await project.save();
      touched += 1;
      console.log(`Updated ${project.title || project._id} → ${desiredSlug}`);
    }
  }

  if (!touched) {
    console.log('All projects already have unique slugs.');
  } else {
    console.log(`Backfill complete. ${touched} project${touched === 1 ? '' : 's'} updated.`);
  }
}

(async () => {
  try {
    await connect();
    await backfill();
  } catch (err) {
    console.error('Backfill failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
})();
