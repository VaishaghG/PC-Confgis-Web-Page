const mongoose = require('mongoose');
require('dotenv').config();

const CPU = require('../models/cpuModel');
const GPU = require('../models/gpuModel');
const RAM = require('../models/ramModel');
const Storage = require('../models/storageModel');
const Cabinet = require('../models/cabinetModel');
const Product = require('../models/Product');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const models = [
    { model: CPU, type: 'cpu', nameField: 'cpuname' },
    { model: GPU, type: 'gpu', nameField: 'gpuname' },
    { model: RAM, type: 'ram', nameField: 'ramname' },
    { model: Storage, type: 'storage', nameField: 'storagename' },
    { model: Cabinet, type: 'cabinet', nameField: 'brand' } // Cabinet uses brand as name?
  ];

  for (const item of models) {
    const data = await item.model.find();
    for (const doc of data) {
      const name = doc[item.nameField] || (doc.brand + ' ' + (doc.panel || ''));
      const product = new Product({
        _id: doc._id,
        name: name,
        price: doc.price,
        type: item.type,
        imgpath: doc.imgpath,
        rating: doc.rating,
        // Keep other fields
        ...doc.toObject()
      });
      // Remove the old name field to keep it clean if desired, but here we just want it to work
      product.name = name; 
      
      try {
        await Product.updateOne({ _id: doc._id }, product.toObject(), { upsert: true });
        console.log(`Migrated ${item.type}: ${name}`);
      } catch (e) {
        console.error(`Error migrating ${name}:`, e.message);
      }
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
