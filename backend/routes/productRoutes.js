const express = require('express');
const router = express.Router();
const Cpu = require('../models/cpuModel');
const Gpu = require('../models/gpuModel');
const Ram = require('../models/ramModel');
const Storage = require('../models/storageModel');
const Cabinet = require('../models/cabinetModel');

// ── GET /api/products/search ──
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.trim() === '') {
            return res.json([]);
        }

        const regex = new RegExp(query, 'i');

        // Search in parallel across all models
        const [cpus, gpus, rams, storages, cabinets] = await Promise.all([
            Cpu.find({ cpuname: regex }).limit(5),
            Gpu.find({ gpuname: regex }).limit(5),
            Ram.find({ ramname: regex }).limit(5),
            Storage.find({ storagename: regex }).limit(5),
            Cabinet.find({ brand: regex }).limit(5)
        ]);

        // Standardize output format
        const results = [
            ...cpus.map(p => ({ id: p._id, name: p.cpuname, image: p.imgpath, type: 'cpu' })),
            ...gpus.map(p => ({ id: p._id, name: p.gpuname, image: p.imgpath, type: 'gpu' })),
            ...rams.map(p => ({ id: p._id, name: p.ramname, image: p.imgpath, type: 'ram' })),
            ...storages.map(p => ({ id: p._id, name: p.storagename, image: p.imgpath, type: 'storage' })),
            ...cabinets.map(p => ({ id: p._id, name: p.brand, image: p.imgpath, type: 'cabinet' }))
        ];

        // Sort by name or relevance (optional)
        results.sort((a, b) => a.name.localeCompare(b.name));

        // Limit total results
        res.json(results.slice(0, 10));

    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ message: 'Server error during search' });
    }
});

module.exports = router;
