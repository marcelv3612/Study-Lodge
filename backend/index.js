const express = require("express");

const app = express();

const router = require("./src/routes");

const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/api/", router);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
