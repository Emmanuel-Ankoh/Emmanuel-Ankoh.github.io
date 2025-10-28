const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }
  },
  { timestamps: true }
);

adminSchema.methods.verifyPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.statics.bootstrap = async function (username, password) {
  if (!username || !password) return;
  const existing = await this.findOne({ username });
  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    await this.create({ username, passwordHash: hash });
    console.log('Admin user bootstrapped');
  }
};

module.exports = mongoose.model('Admin', adminSchema);
