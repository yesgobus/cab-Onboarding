var createError = require("http-errors");
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser');
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const multer = require('multer')

var dbCon = require("./lib/db");

const cabdriverRoute = require("./routes/cabdriver");
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, authorization");
  next();
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer().any())

if (app.get("env") === "development") {
    app.use(logger("dev"));
  }

app.use("/cabdriver",cabdriverRoute)

app.use(function (req, res, next) {
    next(createError(404));
  });
  
  // error handler
  app.listen(8000, () => {
    //connect();
    console.log(`server started on port ${8000}`);
  });