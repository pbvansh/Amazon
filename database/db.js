const { MongoClient } = require('mongodb');
require('dotenv').config();

const url = process.env.MONGO_URL;

const client = new MongoClient(url)

const connectToDatabase = async () => {
    await client.connect();
    console.log('successfully connected to database');
}

module.exports = {
    client,
    connectToDatabase
}