const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' }); // Ensure correct path to .env
const PCBuild = require('../models/PCBuild');
const User = require('../models/User');
const Cabinet = require('../models/cabinetModel');

async function migrateCabinets() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pc_config_db');
    console.log('Connected to MongoDB');

    // 1. Migrate PCBuilds
    const builds = await PCBuild.find({});
    let buildUpdates = 0;

    for (const build of builds) {
      // Check if cabinet is a string (or an object with only name but missing image/id)
      let cabinetName = null;
      if (typeof build.cabinet === 'string' && build.cabinet.trim()) {
        cabinetName = build.cabinet;
      } else if (build.cabinet && build.cabinet.name && (!build.cabinet.image || !build.cabinet.id)) {
        cabinetName = build.cabinet.name;
      }
      
      // We also handle the case where Mongoose casts a String to the object schema, 
      // where `build.get('cabinet')` might be weird. Let's get raw document:
      const rawBuild = build.toObject();
      if (typeof rawBuild.cabinet === 'string' && rawBuild.cabinet.trim()) {
          cabinetName = rawBuild.cabinet;
      }

      if (cabinetName) {
        const cab = await Cabinet.findOne({ brand: { $regex: cabinetName.trim(), $options: 'i' } });
        if (cab) {
          await PCBuild.updateOne(
            { _id: build._id },
            { $set: { cabinet: { id: cab._id.toString(), name: cab.brand, image: cab.imgpath } } }
          );
          buildUpdates++;
        } else {
             console.log(`No cabinet found for old build ID ${build._id} with cabinet: ${cabinetName}`);
        }
      }
    }
    console.log(`Migrated ${buildUpdates} PCBuilds.`);

    // 2. Migrate User Carts
    const users = await User.find({ "cart.builds": { $exists: true, $not: { $size: 0 } } });
    let userUpdates = 0;

    for (const user of users) {
      let modified = false;
      const rawUser = user.toObject();
      
      for (const b of rawUser.cart.builds) {
        if (!b.components || !b.components.cabinet) continue;
        
        let cabinetName = null;
        if (typeof b.components.cabinet === 'string' && b.components.cabinet.trim()) {
          cabinetName = b.components.cabinet;
        } else if (typeof b.components.cabinet === 'object' && b.components.cabinet.name && !b.components.cabinet.image) {
          cabinetName = b.components.cabinet.name;
        }

        if (cabinetName) {
          const cab = await Cabinet.findOne({ $or: [{ Brand: { $regex: cabinetName.trim(), $options: 'i' } }, { brand: { $regex: cabinetName.trim(), $options: 'i' } }] });
          if (cab) {
            b.components.cabinet = { id: cab._id.toString(), name: cab.brand, image: cab.imgpath };
            modified = true;
          }
        }
      }

      if (modified) {
        await User.updateOne({ _id: user._id }, { $set: { "cart.builds": rawUser.cart.builds } });
        userUpdates++;
      }
    }
    console.log(`Migrated builds in ${userUpdates} Users' carts.`);

    console.log('Migration Complete.');
    process.exit(0);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateCabinets();
