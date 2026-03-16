const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const UserCollection = mongoose.connection.db.collection('Users');

  // Find all users where cart is an array
  const usersWithArrayCart = await UserCollection.find({ cart: { $type: 'array' } }).toArray();
  console.log(`Found ${usersWithArrayCart.length} users with array-style cart.`);

  for (const user of usersWithArrayCart) {
    console.log(`Migrating user: ${user.email}`);
    
    // Convert array cart to object cart
    // If the array had items, we could try to preserve them, but mostly it's likely []
    const newCart = {
      items: user.cart.map(item => ({
        productId: item.productId,
        name: item.name || 'Unknown Product',
        price: item.price || 0,
        quantity: item.quantity || 1
      })).filter(item => item.productId), // only keep items with IDs
      builds: []
    };

    await UserCollection.updateOne(
      { _id: user._id },
      { $set: { cart: newCart } }
    );
  }

  // Also handle users who might not have a cart field at all
  const result = await UserCollection.updateMany(
    { cart: { $exists: false } },
    { $set: { cart: { items: [], builds: [] } } }
  );
  console.log(`Updated ${result.modifiedCount} users missing the cart field.`);

  console.log('User migration complete');
  process.exit(0);
}

migrateUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
