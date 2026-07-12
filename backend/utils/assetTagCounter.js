const mongoose = require('mongoose');

/**
 * AssetCounter — single-document counter for sequential asset tag generation.
 * Uses findOneAndUpdate with $inc + upsert:true for atomic, concurrent-safe increments.
 */
const assetCounterSchema = new mongoose.Schema({
  _id: { type: String, default: 'assetTag' },
  seq: { type: Number, default: 0 },
});

const AssetCounter = mongoose.model('AssetCounter', assetCounterSchema);

/**
 * nextTag() — atomically increments the counter and returns the next tag.
 * Format: AF-0001, AF-0002, ... AF-9999, AF-10000 (no truncation above 9999)
 */
const nextTag = async () => {
  const counter = await AssetCounter.findOneAndUpdate(
    { _id: 'assetTag' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const padded = String(counter.seq).padStart(4, '0');
  return `AF-${padded}`;
};

module.exports = { nextTag };
