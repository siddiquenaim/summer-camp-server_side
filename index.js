const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
    const classCollection = client.db("summerCamp").collection("classes");
    const selectedClassCollection = client
      .db("summerCamp")
      .collection("selectedClasses");
    const userCollection = client.db("summerCamp").collection("users");
    const paymentCollection = client.db("summerCamp").collection("payments");
    const reviewCollection = client
      .db("summerCamp")
      .collection("clientReviews");

    // jwt token related api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "3h",
      });

      res.send({ token });
    });

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "Admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // verify student middleware
    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "Student") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // verify admin middleware
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "Instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }
      next();
    };

    // users related api
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
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

    app.delete("/delete-user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // admin api

    // make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "Admin",
        },
      };

      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ admin: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "Admin" };
      res.send(result);
    });

    // check student
    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ student: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { student: user?.role === "Student" };
      res.send(result);
    });

    // instructor related api
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedUser = {
        $set: {
          role: "Instructor",
        },
      };

      const result = await userCollection.updateOne(query, updatedUser);
      res.send(result);
    });

    app.get("/all-instructors", async (req, res) => {
      const query = { role: "Instructor" };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/popular-instructors", async (req, res) => {
      const query = { role: "Instructor" };
      const sortedInstructors = await userCollection
        .find(query)
        .sort({ numberOfStudents: -1 })
        .limit(6)
        .toArray();

      res.send(sortedInstructors);
    });

    // check instructor
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "Instructor" };
      res.send(result);
    });

    app.get("/classes/instructor/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        instructorEmail: email,
        status: "Approved",
      };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    //homepage others
    //client reviews - fetch
    app.get("/client-reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // classes related api
    app.get("/all-classes", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // approve a class api
    app.patch("/approve-class/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedClass = {
        $set: {
          status: "Approved",
        },
      };
      const result = await classCollection.updateOne(filter, updatedClass);
      res.send(result);
    });

    app.patch("/deny-class/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedClass = {
        $set: {
          status: "Denied",
        },
      };
      const result = await classCollection.updateOne(filter, updatedClass);
      res.send(result);
    });

    //  single class information
    app.get("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.findOne(query);
      res.send(result);
    });

    app.get("/all-approved-classes", async (req, res) => {
      const query = { status: "Approved" };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    // add a feedback api
    app.patch("/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const { feedback } = req.body;
      console.log(feedback);
      const query = { _id: new ObjectId(id) };
      const updatedClass = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollection.updateOne(query, updatedClass);
      res.send(result);
    });

    // classes added my an instructor
    app.get("/my-classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { instructorEmail: email };
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/popular-classes", async (req, res) => {
      const query = { status: "Approved" };
      const sortedClasses = await classCollection
        .find(query)
        .sort({ totalStudents: -1 })
        .limit(6)
        .toArray();

      res.send(sortedClasses);
    });

    // added class related api
    app.post("/add-a-class", async (req, res) => {
      const newClass = req.body;
      const result = await classCollection.insertOne(newClass);
      res.send(result);
    });

    app.patch("/update-a-class/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedClass = {
        $set: {
          name: body.name,
          price: body.price,
          image: body.image,
          availableSeats: body.availableSeats,
        },
      };

      result = await classCollection.updateOne(filter, updatedClass);
      res.send(result);
    });

    // selected class related api

    app.get("/all-selected-classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/add-selected-class", async (req, res) => {
      const selectedClass = req.body;
      const result = await selectedClassCollection.insertOne(selectedClass);
      res.send(result);
    });

    app.delete("/delete-a-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      // console.log(query);
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment related api
    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment);
      console.log(payment);

      const query = { _id: new ObjectId(payment.class._id) };
      const deleteResult = await selectedClassCollection.deleteOne(query);

      res.send({ result, deleteResult });
    });

    app.patch("/update-card/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedClass = {
        $inc: {
          totalStudents: 1,
          availableSeats: -1,
        },
      };

      const result = await classCollection.updateOne(query, updatedClass);
      res.send(result);
    });

    app.get("/payments/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection
        .find(query)
        .sort({ date: -1 })
        .toArray();
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
