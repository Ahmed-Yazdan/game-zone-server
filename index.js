const express = require('express');
const app = express();
const cors = require("cors");
const admin = require("firebase-admin");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

// Middlewares
app.use(cors());
app.use(express.json());
require('dotenv').config();

var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const verifyToken = async (req, res, next) => {
    if (req.headers?.authorization.startsWith('Bearer ')) {
        const token = req.headers.authorization.slice(7)
        try {
            const decodedUser = await admin.auth().verifyIdToken(token)
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next()
};

// MongoDB user setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0v9zw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// MONGODB //
async function run() {
    try {
        await client.connect();

        const database = client.db('gamezone');
        const gamesCollection = database.collection('games');
        const ordersCollection = database.collection('orders');
        const cartItemsCollection = database.collection('cartItemsCollection');
        const usersCollection = database.collection('users');
        const ratingsCollection = database.collection('ratings');

        app.get('/games', async (req, res) => {
            const cursor = gamesCollection.find({});
            const games = await cursor.toArray();
            res.send(games);
        });
        app.post('/games', async (req, res) => {
            const game = req.body;
            const result = await gamesCollection.insertOne(game);
            res.json(result);
        });
        app.get('/ratings', async (req, res) => {
            const cursor = ratingsCollection.find({});
            const rating = await cursor.toArray();
            res.send(rating);
        });
        app.post('/ratings', async (req, res) => {
            const rating = req.body;
            const result = await ratingsCollection.insertOne(rating);
            res.json(result);
        });
        app.delete('/games', async (req, res) => {
            const gameId = req.body.gameId;
            const query = { _id: new ObjectId(gameId) };
            const result = await gamesCollection.deleteOne(query);
            if (result.deletedCount === 1) {
                res.json(result)
            };
        });
        app.put('/games', verifyToken, async (req, res) => { // sadsafsef//
            const updatedField = req.body.field;
            const updatedValue = req.body.value;
            const updatedInfo = new Object;
            updatedInfo[updatedField] = updatedValue;
            const id = req.body.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    ...updatedInfo
                }
            };
            const result = await gamesCollection.updateOne(filter, updatedDoc)
            res.json(result);
        })
        app.get('/games/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await gamesCollection.findOne(query);
            res.send(result);
        });

        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        })
        app.get('/allorders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);
        })
        app.put('/allorders', verifyToken, async (req, res) => {
            const orderId = req.body.id;
            const filter = { _id: new ObjectId(orderId) };
            const updateDoc = {
                $set: {
                    status: 'approved'
                }
            };
            const result = await ordersCollection.updateOne(filter, updateDoc)
            res.json(result);
        });
        app.delete('/allorders', verifyToken, async (req, res) => {
            const orderId = req.body.id;
            const query = { _id: new ObjectId(orderId) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result)
        });
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        });
        app.get('/cart', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const cursor = cartItemsCollection.find(query);
            const cartItems = await cursor.toArray();
            res.json(cartItems);
        })
        app.post('/cart', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const item = req.body;
            const result = await cartItemsCollection.insertOne(item);
            res.json(result);
        });
        app.delete('/cart', verifyToken, async (req, res) => {
            const itemId = req.body.id;
            const query = { _id: new ObjectId(itemId) };
            const result = await cartItemsCollection.deleteOne(query);
            res.json(result)
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            };
            res.json({ admin: isAdmin })
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result);
        });
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAcc = await usersCollection.findOne({ email: requester })
                if (requesterAcc.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            } else {
                res.status(403).json({ message: 'Nice try. Better luck next time' })
            }
        });
    }
    finally {
        // await client.close();
    }
};

run().catch(console.dir);




app.get('/', (req, res) => {
    res.send("hello world");
});

app.listen(port, () => {
    console.log('listening to port', port);
});



/* 

{
  "type": "service_account",
  "project_id": "game-zone-ay",
  "private_key_id": "fef40356b418efc786f71b05d987b374962d6739",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCJK7CnTiOcmqZv\nFK00JeqD4ms1/VXDBG06Th/zfNzZ44Wlg/Gl0K+j99plyL6v/htHJtMoncfIcX/A\nTRkF5LcJhd88MKFdO1D+1Rjquhsfwi42CIZbLyolU5B0eUwVAny5du/5oZxxdref\nv+DXErXJQDXAfh0GNA4qKwzsK5q/oRDTbSnbT/cDqHC2PimNIF7xAqB0u1CFuKIx\naGhAaDQP4M2jH12Xg2j6s0cqdbbRPiOXqv+0weCSyqqIHJ4exNratDSSa6ZHqYCi\n4f1I/JESCw5Fjgz8sx+nA+k6vJRhZNb8PD4p7YfwwaHoFT+OVNkP3Xt62SRMiqEF\nfiArzEDnAgMBAAECggEAA11SenAUuIkkjvHzY6WQcIazuYHKwjtQEI+NAhRseF23\nz/0CBt6tCDkSns+DOd7iPWcK4+Km3VhHWWiqtfXLtYyWkqvgsWA8ltuUPmGtO6Sw\nLHweC4uHHZ5Em07EWnmSpJvxu+5GX5QZYe47bhsT4WlVSDDvtlC9jjQ7H2ncZFne\nVP8Lb+2KHy0ogzIpM4Sc27tUhVii/EkxdibmBoN8KIOE3bsTUWjkDPjcg6KPWN+4\nljoQswXp+VzI//q12q/xCgDGfyEpAeFcC12q1qMiezEBKug3jl40szAl1AVsMJJ+\nYNNw2cWiIL9LQ1CuTmol78cyXHWCHVwuRIiC/qsUoQKBgQDArtfGuoQBk+Gnw9Yf\nq7/4SwnIg2KBOzlWQosgVOdmlW0jtjOa2uQdij4hmfGoCU8A8rEghRo/szvC/+EG\nUfU0IdTB7f/tAw4fzs+cRh/IGXgPId6xMNQ0bqNqbk9JeEY51woq0LKKWxSFY99O\n5AWN9Id0b4w08zicTget1tezBwKBgQC2PvWqoyY/YCAENmFJZN61bIf44VEc3Bsq\nmBfwBqd5UCRLhyrROzINl1RXut2PoKrSY5QKfTF2d8NmfqTi0yJY74a+YehRWUBg\neVfcTfRqUo4AqpdRMUYGT2nPHXJvTQWecrOFQrLYQj1kuHRtgTrF+4syLVJq3vd2\nY7sAMrQrIQKBgG/yJTM0khVIkcYipXjpFDNxhVGV49kpS3quVp6GNZsIHcytwvWp\nTvdKpiZnhlsWbWwjlH1MV5/CxmnYuCgv3cJYFYBGgnZ1W/Nm+H/Wzgg3o+VGzFcu\nA1wjG5ZuWGpbEpHwOdv+PHzdxeJp0AfJuuBqvXgMhu0MkktdmmCJffBpAoGBAIHh\naM9NKorsBKU75CWcP6PoTxct7NK2gp3eeuDSvTQVy2gQUpF+sHNDMBa90/zyMgty\ncCTxh/i37Yf0JaqJcecT/WFdAWZIRzr5/4XAALptT0pmSSTSCuegXPYANHfh2mlL\nsWj9WdwJiRto4YDRIoPKey8tYZlMgevbs3+2ovRBAoGALYcOM3PXtxKi8hsX1Iqd\nd1XwLjsEgtBc+2GbgSJIBL93a5M4BUrqsRUDkMV2w1X8fID1dFltccjjjPM7flnh\nD5qDasbdYG1J3FeZyBz4wQrEPX0Da//LWJWG9nDcS6knSuyLTMRi8B5egCeY+6CT\nxwc462PcvjTkXRjUYb8Cl40=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-ad0kc@game-zone-ay.iam.gserviceaccount.com",
  "client_id": "111737162477448823467",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-ad0kc%40game-zone-ay.iam.gserviceaccount.com"
}

*/