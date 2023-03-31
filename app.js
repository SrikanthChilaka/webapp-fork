const express=require("express")
const app=express()
const cors=require("cors")
const routes =require('./Api/routes/routes.js');
const {sequelize}=require("./Api/models/model.js")
const morgan = require("morgan")
const fs = require('fs');
const path = require('path');

// if(process.env.NODE_ENV === "dev") {
    sequelize.sync().then(() => console.log("Syncing DB")).catch(() => console.log("Syncing Failed"))
// }

sequelize.sync()
app.use(express.json()) 

app.use(cors()) 
app.use(express.urlencoded())

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'combined.log'), { flags: 'a' });

app.use(morgan('combined', { stream: accessLogStream }));

app.use(routes)
module.exports=app