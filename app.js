const express=require("express")
const app=express()
const cors=require("cors")
const routes =require('./Api/routes/routes.js');
const {sequelize}=require("./Api/models/model.js")

// if(process.env.NODE_ENV === "dev") {
    sequelize.sync().then(() => console.log("Syncing DB")).catch(() => console.log("Syncing Failed"))
// }

sequelize.sync()
app.use(express.json()) 

app.use(cors()) 
app.use(express.urlencoded())

app.use(routes)
module.exports=app