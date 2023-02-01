const express=require("express")
const app=express()
const cors=require("cors")
const routes =require('./Api/routes/routes.js');

app.use(express.json()) 
app.use(cors()) 
app.use(express.urlencoded())

app.use(routes)
module.exports=app