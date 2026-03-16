const express = require('express');
const PCBuild = require('../models/PCBuild');
const router = express.Router();

// ── Auth guard middleware ──
function requireAuth(req, res, next) {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  req.userId = userId;
  next();
}

// ── POST /api/builds/save ──
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { name, cpu, gpu, ram, storage, cabinet } = req.body;
    
    // Find the existing draft for this user
    let build = await PCBuild.findOne({ userId: req.userId, status: 'draft' });
    
    if (build) {
        // Promote draft to saved
        build.name = name || 'My PC Build';
        build.cpu = cpu || build.cpu;
        build.gpu = gpu || build.gpu;
        build.ram = ram || build.ram;
        build.storage = storage || build.storage;
        build.cabinet = cabinet || build.cabinet;
        build.status = 'saved';
        await build.save();
    } else {
        // Fallback: Create new saved build if no draft found (shouldn't happen with proper frontend sync)
        build = new PCBuild({
            userId: req.userId,
            name: name || 'My PC Build',
            cpu: cpu || '',
            gpu: gpu || '',
            ram: ram || '',
            storage: storage || '',
            cabinet: cabinet || '',
            status: 'saved'
        });
        await build.save();
    }
    
    // Legacy cleanup: Clear activeBuild on User if it still exists
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.userId, { $unset: { 'cart.activeBuild': "" } });

    res.json({ message: 'Build saved', build });
  } catch (err) {
    console.error('Save build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/builds/my ──
router.get('/my', requireAuth, async (req, res) => {
  try {
    const builds = await PCBuild.find({ userId: req.userId, status: 'saved' }).sort({ createdAt: -1 });
    res.json(builds);
  } catch (err) {
    console.error('Fetch builds error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/builds/:id ──
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const build = await PCBuild.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!build) return res.status(404).json({ message: 'Build not found' });
    res.json({ message: 'Build deleted' });
  } catch (err) {
    console.error('Delete build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/current', requireAuth, async (req, res) => {
  try {
    const build = await PCBuild.findOne({ userId: req.userId, status: 'draft' });
    res.json(build || {});
  } catch (err) {
    console.error('Fetch current build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/builds/update-current ──
router.post('/update-current', requireAuth, async (req, res) => {
  try {
    const { type, name } = req.body;
    
    let draft = await PCBuild.findOne({ userId: req.userId, status: 'draft' });
    
    if (!draft) {
        draft = new PCBuild({
            userId: req.userId,
            status: 'draft'
        });
    }
    
    draft[type] = name;
    await draft.save();
    
    res.json({ success: true, draft });
  } catch (err) {
    console.error('Update current build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
