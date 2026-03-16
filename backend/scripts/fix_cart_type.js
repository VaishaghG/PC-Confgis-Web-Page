const mongoose = require('mongoose');
require('dotenv').config();

async function forceFixCartType() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const UserCollection = mongoose.connection.db.collection('Users');

  // FIND ALL USERS
  const users = await UserCollection.find({}).toArray();
  console.log(`Checking ${users.length} users...`);

  for (const user of users) {
    const isArray = Array.isArray(user.cart);
    const hasItems = user.cart && user.cart.items;
    
    if (isArray || !hasItems) {
      console.log(`Fixing cart for: ${user.email} (Current type: ${isArray ? 'Array' : typeof user.cart})`);
      
      // Radical: Unset and Set to handle BSON type constraint
      await UserCollection.updateOne(
        { _id: user._id },
        { $unset: { cart: "" } }
      );

      await UserCollection.updateOne(
        { _id: user._id },
        { $set: { cart: { items: [], builds: [] } } }
      );
    }
  }

  console.log('Force migration complete');
  process.exit(0);
}

forceFixCartType().catch(err => {
  console.error(err);
  process.exit(1);
});
