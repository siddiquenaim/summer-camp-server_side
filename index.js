const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zilkyvq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // collection
    const instructorCollection = client
      .db("summerCamp")
      .collection("instructors");
    const classCollection = client.db("summerCamp").collection("classes");
    const selectedClassCollection = client
      .db("summerCamp")
      .collection("selectedClasses");
    const userCollection = client.db("summerCamp").collection("users");

    // users related api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const query = { email: newUser.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // admin api

    app.patch("users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };

      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // instructor related api
    app.get("/all-instructors", async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    });

    app.get("/popular-instructors", async (req, res) => {
      const sortedInstructors = await instructorCollection
        .find()
        .sort({ numberOfStudents: -1 })
        .limit(6)
        .toArray();

      res.send(sortedInstructors);
    });

    // classes related api
    app.get("/all-classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/popular-classes", async (req, res) => {
      const sortedClasses = await classCollection
        .find()
        .sort({ numberOfStudents: -1 })
        .limit(6)
        .toArray();

      res.send(sortedClasses);
    });

    // Selected class related api
    app.post("/add-selected-class", async (req, res) => {
      const selectedClass = req.body;
      console.log(selectedClass);
      const result = await selectedClassCollection.insertOne(selectedClass);
      res.send(result);
    });

    app.get("/all-selected-classes", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/delete-a-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      console.log(query);
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("The server is running");
});

app.listen(port, (req, res) => {
  console.log(`The server is running on port: ${port}`);
});
