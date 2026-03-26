const mongoose = require('./backend/node_modules/mongoose');
const User = require('./backend/models/User');
require('./backend/node_modules/dotenv').config({ path: './backend/.env' });

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'admin@pcconfig.com' });
        console.log('Admin User:', user ? { email: user.email, role: user.role } : 'Not found');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

checkAdmin();
