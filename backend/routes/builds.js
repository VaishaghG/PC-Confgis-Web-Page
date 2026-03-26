const express = require('express');
const PCBuild = require('../models/PCBuild');
const Cabinet = require('../models/cabinetModel');
const router = express.Router();

// ── Auth guard middleware ──
function requireAuth(req, res, next) {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) return res.status(401).json({ message: 'Not authenticated' });
  req.userId = userId;
  next();
}

//
// ───────────── SAVE BUILD ─────────────
//
router.post('/save', requireAuth, async (req, res) => {
  try {
    const { name, cpu, gpu, ram, storage, cabinet } = req.body;

    // ✅ STRICT CABINET FETCH (CASE-INSENSITIVE)
    let cabinetData = null;

    if (cabinet) {
      const prod = await Cabinet.findOne({
        Brand: { $regex: `^${cabinet}$`, $options: 'i' }
      }).lean();

      if (!prod) {
        console.error("❌ Cabinet NOT FOUND:", cabinet);
        return res.status(400).json({ message: `Cabinet not found: ${cabinet}` });
      }

      cabinetData = {
        id: prod._id.toString(),
        name: prod.Brand,
        image: prod.imgpath // 🔥 CRITICAL FIX
      };
    }

    // Find draft
    let build = await PCBuild.findOne({
      userId: req.userId,
      status: 'draft'
    });

    if (build) {
      // ✅ Update draft → saved
      build.name = name || 'My PC Build';
      build.cpu = cpu || build.cpu;
      build.gpu = gpu || build.gpu;
      build.ram = ram || build.ram;
      build.storage = storage || build.storage;

      if (cabinetData) {
        build.cabinet = cabinetData;
      }

      build.status = 'saved';
      await build.save();

    } else {
      // ✅ Create new build
      build = new PCBuild({
        userId: req.userId,
        name: name || 'My PC Build',
        cpu: cpu || '',
        gpu: gpu || '',
        ram: ram || '',
        storage: storage || '',
        cabinet: cabinetData || {
          id: '',
          name: '',
          image: ''
        },
        status: 'saved'
      });

      await build.save();
    }

    // Cleanup user cart
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.userId, {
      $unset: { 'cart.activeBuild': "" }
    });

    res.json({ message: 'Build saved', build });

  } catch (err) {
    console.error('Save build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//
// ───────────── GET BUILDS ─────────────
//
router.get('/my', requireAuth, async (req, res) => {
  try {
    const builds = await PCBuild.find({
      userId: req.userId,
      status: 'saved'
    }).sort({ createdAt: -1 });

    res.json(builds);
  } catch (err) {
    console.error('Fetch builds error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//
// ───────────── DELETE BUILD ─────────────
//
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const build = await PCBuild.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!build) {
      return res.status(404).json({ message: 'Build not found' });
    }

    res.json({ message: 'Build deleted' });

  } catch (err) {
    console.error('Delete build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//
// ───────────── GET CURRENT (DRAFT) ─────────────
//
router.get('/current', requireAuth, async (req, res) => {
  try {
    const build = await PCBuild.findOne({
      userId: req.userId,
      status: 'draft'
    });

    // Return clean empty structure so frontend count logic never sees null/undefined
    res.json(build || {
      cpu: '', gpu: '', ram: '', storage: '',
      cabinet: { id: '', name: '', image: '' }
    });
  } catch (err) {
    console.error('Fetch current build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


//
// ───────────── UPDATE CURRENT BUILD ─────────────
//
router.post('/update-current', requireAuth, async (req, res) => {
  try {
    const { type, name } = req.body;

    let draft = await PCBuild.findOne({
      userId: req.userId,
      status: 'draft'
    });

    if (!draft) {
      draft = new PCBuild({
        userId: req.userId,
        status: 'draft'
      });
    }

    if (type === 'cabinet') {
      // ── DESELECT: clear cabinet field ──────────────────────────────────────
      if (!name || name === 'null') {
        draft.cabinet = { id: '', name: '', image: '' };

      // ── SELECT: look up real cabinet by Brand ──────────────────────────────
      } else {
        const prod = await Cabinet.findOne({
          Brand: { $regex: `^${name}$`, $options: 'i' }
        }).lean();

        if (!prod) {
          console.error("❌ Cabinet NOT FOUND:", name);
          return res.status(400).json({ message: `Cabinet not found: ${name}` });
        }

        draft.cabinet = {
          id: prod._id.toString(),
          name: prod.Brand,
          image: prod.imgpath
        };
      }

    } else {
      // For all other types: null/empty means deselect
      draft[type] = (name && name !== 'null') ? name : '';
    }

    await draft.save();

    res.json({ success: true, draft });

  } catch (err) {
    console.error('Update current build error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;