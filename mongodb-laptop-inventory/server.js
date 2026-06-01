require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const MONGO_URL = process.env.MONGO_URL || process.env.MONGO_URI;
const DB_NAME = 'laptop_inventory_db';
const COLLECTION_NAME = 'laptops';

if (!MONGO_URL) {
  console.warn('Warning: MONGO_URL is not set. Set it in your .env for real DB access.');
}

// Serverless-friendly MongoDB client cache
let cachedClient = global.__mongoClientPromise || null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!MONGO_URL) {
    throw new Error('MONGO_URL not configured.');
  }

  const client = new MongoClient(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  cachedClient = client;
  global.__mongoClientPromise = cachedClient;
  return cachedClient;
}

// Routes
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Laptop Inventory API is running.' });
});

app.get('/api/laptops', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const laptops = await collection.find({}).toArray();
    res.json(laptops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch laptops.' });
  }
});

app.post('/api/laptops', async (req, res) => {
  try {
    const { laptop_brand, series, price } = req.body || {};
    if (!laptop_brand || !series || (price === undefined || price === null)) {
      return res.status(400).json({ error: 'All fields (laptop_brand, series, price) are required.' });
    }

    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice)) {
      return res.status(400).json({ error: 'Price must be a valid number.' });
    }

    const client = await connectToDatabase();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const doc = { laptop_brand, series, price: parsedPrice, createdAt: new Date() };
    const result = await collection.insertOne(doc);
    doc._id = result.insertedId;
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create laptop record.' });
  }
});

app.delete('/api/laptops', async (req, res) => {
  try {
    const client = await connectToDatabase();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const result = await collection.deleteMany({});
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete laptops.' });
  }
});

// Only start server when not in production (Vercel will handle serverless)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

module.exports = app;
