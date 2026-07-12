/**
 * AssetFlow — Admin Seeder
 *
 * Creates the first Admin user (the only way to get an Admin account,
 * since public signup only creates Employee accounts).
 *
 * Usage:
 *   node seeders/adminSeeder.js
 *   node seeders/adminSeeder.js --force   (delete existing admin and re-create)
 *
 * Credentials default to .env values if set, otherwise uses built-in defaults.
 * Change SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in your .env before running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User     = require('../models/User');

const ADMIN_NAME     = process.env.SEED_ADMIN_NAME     || 'AssetFlow Admin';
const ADMIN_EMAIL    = process.env.SEED_ADMIN_EMAIL    || 'admin@assetflow.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';

const FORCE = process.argv.includes('--force');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (!FORCE) {
        console.log(`⚠️  Admin already exists: ${ADMIN_EMAIL}`);
        console.log('   Run with --force to delete and re-create.');
        process.exit(0);
      }
      await User.deleteOne({ email: ADMIN_EMAIL });
      console.log('🗑️  Existing admin deleted (--force)');
    }

    const admin = await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role:     'Admin',
      status:   'Active',
    });

    console.log('\n🌱 Admin seeded successfully!');
    console.log('─────────────────────────────────────');
    console.log(`  Name    : ${admin.name}`);
    console.log(`  Email   : ${admin.email}`);
    console.log(`  Password: ${ADMIN_PASSWORD}  ← change after first login!`);
    console.log(`  Role    : ${admin.role}`);
    console.log(`  ID      : ${admin._id}`);
    console.log('─────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Seeder error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
