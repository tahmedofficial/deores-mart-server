require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({ origin: ["http://localhost:5173"], credentials: true, }));
app.use(express.json());
// app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ufkobjs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const database = client.db("deoresDB");
        const usersCollection = database.collection("users");
        const addressCollection = database.collection("address");

        // Users related api
        app.get("/users", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: "user already exists", insertrdId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        // Find user role
        app.get("/admin/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }
            res.send({ admin });

        })

        // Address related api
        app.get("/address/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await addressCollection.findOne(query);
            res.send(result);
        })

        app.patch("/address/:email", async (req, res) => {
            const address = req.body;
            const email = req.params.email;
            const query = { email: email };
            const options = { upsert: true };
            const updateAddress = {
                $set: {
                    name: address.name,
                    email: address.email,
                    house: address.house,
                    road: address.road,
                    area: address.area,
                    city: address.city,
                    detailsAddress: address.detailsAddress
                }
            };
            const result = await addressCollection.updateOne(query, updateAddress, options);
            res.send(result);
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get("/", (req, res) => {
    res.send("Server is running");
})

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
})