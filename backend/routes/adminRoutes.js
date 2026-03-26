const express = require('express');
const multer = require('multer');
const path = require('path');
const requireAdmin = require('../middleware/adminAuth');

const Cpu = require('../models/cpuModel');
const Gpu = require('../models/gpuModel');
const Ram = require('../models/ramModel');
const Storage = require('../models/storageModel');
const Cabinet = require('../models/cabinetModel');
const User = require('../models/User');
const Order = require('../models/orderModel');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../frontend/images'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

const MODELS = {
    cpu: Cpu,
    gpu: Gpu,
    ram: Ram,
    storage: Storage,
    cabinet: Cabinet
};

function getFieldType(pathDefinition) {
    switch (pathDefinition.instance) {
        case 'Number':
            return 'number';
        case 'Boolean':
            return 'checkbox';
        default:
            return 'text';
    }
}

router.get('/schema/:category', requireAdmin, async (req, res) => {
    try {
        const { category } = req.params;
        const Model = MODELS[category.toLowerCase()];
        if (!Model) return res.status(400).json({ message: 'Invalid category' });

        const fields = Object.entries(Model.schema.paths)
            .filter(([key]) => key !== '_id' && key !== '__v')
            .map(([key, pathDefinition]) => ({
                key,
                type: getFieldType(pathDefinition)
            }));

        res.json({ category, fields });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/products/:category', requireAdmin, async (req, res) => {
    try {
        const { category } = req.params;
        const Model = MODELS[category.toLowerCase()];
        if (!Model) return res.status(400).json({ message: 'Invalid category' });

        const products = await Model.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/products/:category', requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { category } = req.params;
        const Model = MODELS[category.toLowerCase()];
        if (!Model) return res.status(400).json({ message: 'Invalid category' });

        const data = { ...req.body };
        if (req.file) {
            data.imgpath = `images/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'Image is required for new products' });
        }

        const newProduct = new Model(data);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/products/:category/:id', requireAdmin, async (req, res) => {
    try {
        const { category, id } = req.params;
        const Model = MODELS[category.toLowerCase()];
        if (!Model) return res.status(400).json({ message: 'Invalid category' });

        const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/products/:category/:id', requireAdmin, async (req, res) => {
    try {
        const { category, id } = req.params;
        const Model = MODELS[category.toLowerCase()];
        if (!Model) return res.status(400).json({ message: 'Invalid category' });

        await Model.findByIdAndDelete(id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/analytics', requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();

        const revenueData = await Order.aggregate([
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        const revenue = revenueData.length > 0 ? revenueData[0].total : 0;

        const itemStats = await Order.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    count: { $sum: '$items.quantity' },
                    type: { $first: '$items.productType' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const buildStats = await Order.aggregate([
            { $unwind: '$builds' },
            {
                $group: {
                    _id: '$builds.name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            totalUsers,
            totalOrders,
            revenue,
            popularItems: itemStats,
            popularBuilds: buildStats
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
