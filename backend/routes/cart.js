const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const PCBuild = require('../models/PCBuild');

// ── VERIFY USER SESSION ──
const requireAuth = (req, res, next) => {
  const userId = (req.user && req.user._id) || req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "User not logged in" });
  }
  req.userId = userId;
  next();
};

// ── GET USER CART (WITH HYDRATION) ──
router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Ensure cart exists and is object
    let cart = user.cart;
    if (!cart || Array.isArray(cart)) {
      cart = { items: [], builds: [] };
    }

    // 1. Hydrate Individual Items
    const hydratedItems = await Promise.all((cart.items || []).map(async (item) => {
      const product = await Product.findById(item.productId).lean();
      if (product) {
        return {
          ...item,
          name: product.name,
          price: product.price,
          image: product.imgpath
        };
      }
      return item;
    }));

    // 2. Hydrate Builds
    const hydratedBuilds = await Promise.all((cart.builds || []).map(async (buildEntry) => {
      const components = buildEntry.components || {};
      const hydratedComponents = {};
      let calculatedPrice = 0;

      for (const [key, value] of Object.entries(components)) {
        let name = '';
        if (key === 'cabinet' && typeof value === 'object' && value) {
            name = value.name;
            hydratedComponents[key] = value;
        } else if (typeof value === 'string') {
            name = value;
            hydratedComponents[key] = value;
        } else {
            hydratedComponents[key] = value;
        }

        if (name) {
          const product = await Product.findOne({ name }).lean();
          if (product) {
            // If it's a string, keep it a string. If it was an object, it's already set.
            if (typeof hydratedComponents[key] === 'string') {
                hydratedComponents[key] = product.name;
            }
            calculatedPrice += (product.price || 0);
          }
        }
      }

      return {
        ...buildEntry,
        name: buildEntry.name || 'Custom PC Build',
        price: calculatedPrice || buildEntry.price || 0,
        components: hydratedComponents
      };
    }));
    
    res.json({
      individualItems: hydratedItems,
      builds: hydratedBuilds
    });
  } catch (error) {
    console.error('Cart GET error:', error);
    res.status(500).json({ error: "Server error retrieving cart" });
  }
});

// ── ADD INDIVIDUAL PRODUCT ──
router.post('/add', requireAuth, async (req, res) => {
  const { productId } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.cart || Array.isArray(user.cart)) {
      user.cart = { items: [], builds: [] };
    }

    user.cart.items.push({
      productId: product._id,
      productType: req.body.productType || product.type || 'unknown',
      name: product.name,
      price: product.price,
      quantity: 1
    });

    user.markModified('cart');
    await user.save();
    res.json({ success: true });

  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: "Cart operation failed" });
  }
});

// ── ADD PC BUILD ──
router.post('/add-build', requireAuth, async (req, res) => {
  const { buildId } = req.body;

  try {
    const build = await PCBuild.findById(buildId);
    if (!build) return res.status(404).json({ error: "Build not found" });

    // Fetch product details for all components to get prices
    const components = {
      cpu: build.cpu,
      gpu: build.gpu,
      ram: build.ram,
      storage: build.storage,
      cabinet: build.cabinet
    };

    let buildPrice = 0;
    for (const [key, value] of Object.entries(components)) {
        let lookupName = '';
        if (key === 'cabinet' && typeof value === 'object' && value) {
            lookupName = value.name;
        } else if (typeof value === 'string') {
            lookupName = value;
        }

        if (lookupName) {
            const p = await Product.findOne({ name: lookupName }).lean();
            if (p) buildPrice += (p.price || 0);
        }
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.cart || Array.isArray(user.cart)) {
      user.cart = { items: [], builds: [] };
    }

    // Store names and cabinet object.
    user.cart.builds.push({
      buildId: build._id,
      name: build.name || 'Custom PC Build',
      price: buildPrice,
      components: components
    });

    user.markModified('cart');
    await user.save();
    res.json({ success: true });

  } catch (error) {
    console.error('Add build to cart error:', error);
    res.status(500).json({ error: "Cart operation failed" });
  }
});

// ── REMOVE INDIVIDUAL ITEM ──
router.delete('/item/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Use pull to remove by the subdocument's _id (which is what we should pass from frontend)
    // or fallback to productId if that's what's being passed.
    user.cart.items.pull({ _id: req.params.id });
    
    // Fallback if the above didn't work (for older data or specific frontend logic)
    if (user.cart.items.length === user.cart.items.length) { 
        user.cart.items = user.cart.items.filter(item => 
            item._id.toString() !== req.params.id && 
            item.productId?.toString() !== req.params.id
        );
    }

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: "Error removing from cart" });
  }
});

// ── REMOVE PC BUILD ──
router.delete('/build/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.cart.builds.pull({ _id: req.params.id });

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (error) {
    console.error('Remove build error:', error);
    res.status(500).json({ error: "Error removing build from cart" });
  }
});

module.exports = router;
