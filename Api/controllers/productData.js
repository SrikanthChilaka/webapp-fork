const {Product,User} = require("../models/model.js");
const usersData = require("../controllers/usersData.js");
const base64 = require("base-64");
const bcrypt = require("bcrypt");
const {where} = require("sequelize");

// Product.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
// User.hasMany(Product);

function product_post_validation(name, description, sku, manufacturer, quantity) {

    if (!name || !description || !sku || !manufacturer || !quantity || typeof quantity === 'string' || quantity<0 || quantity>100) return false;

    else return true;
}

function product_put_validation(name, description, sku, manufacturer, quantity){
    if (name===""|| description === "" || sku === "" || manufacturer === "" || quantity === "" || typeof quantity === 'string'|| quantity<0 || quantity>100 ) return false;
    else return true;
}

const post_Product = async(request, response) =>{
    if(!request.headers.authorization){
        response.status(400).send({
          message: "No Auth",
        })
    }
    else{
        const name = request.body.name;
        const description = request.body.description;
        const sku = request.body.sku;
        const manufacturer = request.body.manufacturer;
        const quantity = Number(request.body.quantity);
        const date_added = request.body.date_added;
        const date_last_updated = request.body.date_last_updated;
        const owner_user_id = Number(request.body.owner_user_id);
        const encodedToken = request.headers.authorization.split(" ")[1];
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let username = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
        User.findOne({
            where:
                {
                   username,
            },
        })
        .then(async(user)=>{
            if (user){
                const valid = await bcrypt.compare(decodedPassword,user.getDataValue("password"));
                console.log(valid)        
                if (valid === true && username === user.getDataValue("username")){
                    const sku_no = await Product.findAll({
                        where:{
                            sku : sku,                          
                        }
                    });
                    if (sku_no.length!==0){
                        response.status(400).send({
                            message: "sku already exists",
                        })
                    }
                    else if(!product_post_validation(name, description, sku, manufacturer, quantity)){
                        response.status(400).send({ message: "Invalid entry or no entry!" }); 
                    }
                    else if(date_added||date_last_updated||owner_user_id){
                            response.status(400).send({message: "Invalid entries!"})
                    } 
                        
                    else if(quantity<0 || quantity>100){
                        response.status(400).send({ message: "Product quantity cannot be less than zero!" });
                    }
                   else{
                        Product.create({
                            name : name,
                            description : description,
                            sku : sku,
                            manufacturer : manufacturer,
                            quantity : quantity,
                            date_added : new Date(),
                            date_last_updated : new Date(),
                            owner_user_id : user.getDataValue("id") 
                        })  .then((ack)=>{
                                response.status(201).send({
                                    id : ack.getDataValue("id"),
                                    name : ack.getDataValue("name"),
                                    description : ack.getDataValue("description"),
                                    sku : ack.getDataValue("sku"),
                                    manufacturer : ack.getDataValue("manufacturer"),
                                    quantity : ack.getDataValue("quantity"),
                                    date_added : ack.getDataValue("createdAt"),
                                    date_last_updated : ack.getDataValue("updatedAt"),                                        owner_user_id : ack.getDataValue("owner_user_id")
                                    });  
                                })
                                .catch(() => {
                                    response.status(400).send({
                                        message: "Bad Request",
                                    });
                                });
                        }           
                    }
                    else{
                        response.status(401).send({
                            message: "Wrong Password!",
                        });
                    }
            }
            else{
                response.status(400).send({
                    message: "Invalid User",
                })
            }
        });  
    }    
};

const get_Product = async(request,response)=>{ 
    const id = Number(request.params.id)
    if(!id || typeof id != "number"){
        response.status(400).send({message:"Id is invalid"})
    }
    else
    {
        Product.findOne(
            {
                where:{
                    id:id,
                },
            }
        )
        .then((stage)=> {
            if(stage){
                response.status(200).send({
                    id: stage.getDataValue("id"),
                    name: stage.getDataValue("name"),
                    description: stage.getDataValue("description"),
                    sku: stage.getDataValue("sku"),
                    manufacturer: stage.getDataValue("manufacturer"),
                    quantity: stage.getDataValue("quantity"),
                    date_added: stage.getDataValue("createdAt"),
                    date_last_updated: stage.getDataValue("updatedAt"),
                    owner_user_id: stage.getDataValue("owner_user_id")
                      
                })
            }
            else
            {
                response.status(404).send({
                    message:"Id unavailable"
                })
            }
        })
        .catch(()=>{
            response.status(400).send({
                message:"Bad request "
            })
        })
    }
};

const put_Product = async(request,response)=>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        response.status(400).send({
        message:"No Auth",
    });
    }
    else if(!id || typeof id === "string"){
        response.status(400).send({message:"Check ID!"})
    }
    else{
        const encodedToken = request.headers.authorization.split(" ")[1];
        const name = request.body.name;
        const description = request.body.description;
        const sku = request.body.sku;
        const manufacturer = request.body.manufacturer;
        const quantity = Number(request.body.quantity);
        const date_added = request.body.date_added;
        const date_last_updated = request.body.date_last_updated;
        const owner_user_id = Number(request.body.owner_user_id);
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
        if ( !product_put_validation(name, description, sku, manufacturer, quantity)){
            response.status(400).send({
                message: "Check and give the necessary details!",
            });
        }
        else if (date_added || date_last_updated || owner_user_id){
            response.status(400).send({
                message: "Check and add the necessary details, not updating the date or owner!",
            })
        }
        else{
            User.findOne({
                where: {
                    username: decodedUsername,
                },
            })
            .then(
                async (user)=>{
                const valid = await bcrypt.compare(decodedPassword,user.getDataValue("password")) 
                if(valid===true && decodedUsername === user.getDataValue("username")){
                    Product.findOne({
                        where:{
                            id:id,
                        },
                    })
                    .then(async (product)=>{
                        if (!product){
                            response.status(404).send({
                                message: "Cannot find the product!",
                            })
                        }
                        else if (product.getDataValue("owner_user_id")!== user.getDataValue("id")){
                            response.status(403).send({
                                message: "Access denied!",
                            })
                        }
                        else if(product.getDataValue("owner_user_id")===user.getDataValue("id")){
                            product.update(
                                {
                                    name:name,
                                    description:description,
                                    sku:sku,
                                    manufacturer:manufacturer,
                                    quantity:quantity,
                                    date_last_updated: new Date()
                                })
                            .then((result) => {
                                response.status(204).send({
                                });
                            })
                            .catch(() => {
                                response.status(400).send({
                                    message: "Bad Request. Check the details to update!",
                                });
                            })
                        } else{response.status(400).send({
                            message: "Check the respective user!",
                            });}
                    })
                } 
                else{response.status(401).send({
                    message: "Check the Password!",
                });
                }}
            )
        }
    }
};

const patch_Product = async(request,response)=>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        response.status(400).send({
        message:"No Auth",
    });
    }
    else if(!id || typeof id === "string"){
        response.status(400).send({message:"Check ID!"})
    }
    else{
        const encodedToken = request.headers.authorization.split(" ")[1];
        const name = request.body.name;
        const description = request.body.description;
        const sku = request.body.sku;
        const manufacturer = request.body.manufacturer;
        const quantity = Number(request.body.quantity);
        const date_added = request.body.date_added;
        const date_last_updated = request.body.date_last_updated;
        const owner_user_id = Number(request.body.owner_user_id);
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
        if ( !product_put_validation(name, description, sku, manufacturer, quantity)){
            response.status(400).send({
                message: "Check and give the necessary details!",
            });
        }else if (date_added || date_last_updated || owner_user_id){
            response.status(400).send({
                message: "Check and add the necessary details, not updating the date or owner!",
              })
        }
        else {
            User.findOne({
                where: {
                    username: decodedUsername,
                },
            })
            .then(
                async (user)=>{
                const valid = await bcrypt.compare(decodedPassword,user.getDataValue("password")) 
                if(valid===true && decodedUsername === user.getDataValue("username")){
                    Product.findOne({
                        where:{
                            id:id,
                        },
                    })
                    .then(async (product)=>{
                        if (!product){
                            response.status(404).send({
                                message: "Cannot find the product!",
                            })
                        }
                        else if (product.getDataValue("owner_user_id")!== user.getDataValue("id")){
                            response.status(403).send({
                                message: "Access denied!",
                              })
                        }
                        else if(product.getDataValue("owner_user_id")===user.getDataValue("id")){
                            product.update(
                                {
                                    name:name,
                                    description:description,
                                    sku:sku,
                                    manufacturer:manufacturer,
                                    quantity:quantity,
                                    date_last_updated: new Date()
                                }
                            )
                            .then((result) => {
                                response.status(204).send({
                                });
                            })
                            .catch(() => {
                                response.status(400).send({
                                    message: "Bad Request. Check the details to update!",
                                });
                            })
                        } else{response.status(400).send({
                            message: "Check the respective user!",
                            });}
                    })
                } 
                else{response.status(401).send({
                    message: "Check the Password!",
                });
                }}
            )
        }
    }
};

const delete_Product = async(request, response) =>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        response.status(400).send({
            message:"No Auth",
        });
    }
    else if(!id || typeof id === "string"){
        response.status(400).send({message:"Check ID!"})
    }
    else{
        const encodedToken = request.headers.authorization.split(" ")[1];
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
        User.findOne({
            where: {
              username: decodedUsername,
            },
        })
        .then(async (user)=>{
            const valid = await bcrypt.compare(decodedPassword,user.getDataValue("password")) 
            if(valid===true && decodedUsername === user.getDataValue("username")){
                Product.findOne({
                    where:{
                        id:id,
                    },
                })
                .then(async (product)=>{
                    if (product.getDataValue("owner_user_id")!== user.getDataValue("id")){
                        response.status(403).send({
                            message: "Unauthorized Access!",
                    })}
                else{
                    Product.destroy({
                        where:{
                        id:id,
                    },
                })
                    .then((val)=>{
                        if(val){
                            response.status(204).send({})
                        }
                    })
                }
                })
            .catch((val)=>{
                console.log(val)
                response.status(404).send({
                    message: "Cannot find the product!",
                })
            })
            }   
        else{
            response.status(401).send({
                message: "Check the credentials!",
              })   
        }
    })
    .catch(()=>{
        response.status(400).send({
            message: "Bad Request",
        })
    })
}
};

module.exports = {post_Product, get_Product, put_Product, patch_Product, delete_Product};