const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

// Middlewares
app.use(cors());
require('dotenv').config();

// MongoDB user setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0v9zw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// MONGODB //
async function run(){
    try{
        await client.connect();

        const database = client.db('gamezone');
        const gamesCollection = database.collection('games');

        app.get('/games', (req, res) => {
            res.send('games')
        })
    }
    finally{
        // await client.close();
    }
};

run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("hello world");
});

app.listen(port, () => {
    console.log('listening to port' ,port);
    console.log(uri)
});