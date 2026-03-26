require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });
const mongoose = require('mongoose');
const PCBuild = require('../models/PCBuild');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');

  // Find all drafts where cabinet exists but name is empty — these are stale/orphaned
  const stale = await PCBuild.find({
    status: 'draft',
    $or: [
      { 'cabinet.name': '' },
      { 'cabinet.name': null },
      { cabinet: { $type: 'string' } }   // legacy string-only cabinet
    ]
  });

  console.log(`Found ${stale.length} stale draft(s). Clearing cabinet fields...`);
  for (const draft of stale) {
    draft.cabinet = { id: '', name: '', image: '' };
    await draft.save();
    console.log(`  Cleared draft for userId: ${draft.userId}`);
  }

  console.log('Done.');
  process.exit(0);
})();
