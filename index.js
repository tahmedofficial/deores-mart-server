require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const productsCollection = database.collection("products");

        // jwt related api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: "1h" });
            res.send({ token });
        })

        // Middlewares
        const verifyToken = (req, res, next) => {

            const token = req?.headers?.authorization

            if (!token) {
                return res.status(401).send({ message: "Unauthorized access" });
            }

            jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
                if (error) {
                    return res.status(401).send({ message: "Unauthorized access" });
                }
                req.decoded = decoded;
                next();
            })

        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded?.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send("forbidden access");
            }
            next();
        }

        // Users related api
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            try {
                const filter = req.query.search;
                const query = {
                    $or: [
                        { name: { $regex: filter, $options: "i" } },
                        { email: { $regex: filter, $options: "i" } },
                        { number: { $regex: filter, $options: "i" } }

                    ]
                };
                const result = await usersCollection.find(query).toArray();
                res.send(result);
            }
            catch {
                res.send([]);
            }
        })

        app.get("/users/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };
            const isExist = await usersCollection.findOne(query);
            if (isExist) {
                return res.send({ message: "user already exists", insertedId: null })
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.patch("/users/:email", verifyToken, async (req, res) => {
            const user = req.body;
            const email = req.params.email;
            const query = { email: email };
            const updateUser = {
                $set: {
                    email: user.email,
                    name: user.name,
                    image: user.image || "",
                    number: user.number,
                    role: user.role || ""
                }
            };
            const result = await usersCollection.updateOne(query, updateUser);
            res.send(result);
        })

        // Find user role
        app.get("/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send("forbidden access");
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }
            res.send({ admin });

        })

        // Address related api
        app.get("/address/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await addressCollection.findOne(query);
            res.send(result);
        })

        app.patch("/address/:email", verifyToken, async (req, res) => {
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

        // Products related api
        app.get("/products", async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        })

        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.findOne(query);
            res.send(result);
        })

        app.get("/products/:category", async (req, res) => {
            const category = req.params.category;
            const query = { category: category };
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.post("/products", verifyToken, verifyAdmin, async (req, res) => {
            const product = req.body;
            console.log(product);
            const result = await productsCollection.insertOne(product);
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