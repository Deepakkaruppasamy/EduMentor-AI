const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const schema = new mongoose.Schema({
  date: Date,
  totalQueries: Number,
  retrievalAccuracy: Number,
  avgResponseTime: Number
}, { collection: 'analytics' });

const Analytics = mongoose.model('Analytics', schema);

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://root:edumentor123@localhost:27017/edumentor?authSource=admin';
  console.log('Connecting to:', uri);
  try {
    await mongoose.connect(uri);
    console.log('Connected!');
    
    // Find all analytics records
    const records = await Analytics.find({}).sort({ date: -1 }).limit(10);
    console.log('Total records count:', await Analytics.countDocuments());
    console.log('Last 10 records:', JSON.stringify(records, null, 2));

    // Check if there are any records with totalQueries > 0 and retrievalAccuracy = 0
    const zeroAccCount = await Analytics.countDocuments({ totalQueries: { $gt: 0 }, retrievalAccuracy: 0 });
    console.log('Records with totalQueries > 0 and retrievalAccuracy = 0:', zeroAccCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
