const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const instructors = require("./data/instructors.json");
const classes = require("./data/classes.json");

app.get("/top-classes", (req, res) => {
  // sorting
  const sortedClasses = classes.sort(
    (a, b) => b.numberOfStudents - a.numberOfStudents
  );

  // top-6
  const topClasses = sortedClasses.slice(0, 6);

  res.send(topClasses);
});

app.get("/popular-instructors", (req, res) => {
  const sortedInstructors = instructors.sort(
    (a, b) => b.numberOfStudents - a.numberOfStudents
  );
  const topInstructors = sortedInstructors.slice(0, 6);
  res.send(topInstructors);
});

app.get("/", (req, res) => {
  res.send("The server is running");
});

app.listen(port, (req, res) => {
  console.log(`The server is running on port: ${port}`);
});
