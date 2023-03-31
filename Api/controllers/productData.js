const {Product,User,Image} = require("../models/model.js");
const usersData = require("../controllers/usersData.js");
const base64 = require("base-64");
const bcrypt = require("bcrypt");
const {where} = require("sequelize");
const AWS = require("aws-sdk")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid");
const StatsD = require('hot-shots');
const statsd = new StatsD({ host: 'localhost', port: 8125 });

// Product.belongsTo(User, {constraints: true, onDelete: 'CASCADE'});
// User.hasMany(Product);

function product_post_validation(name, description, sku, manufacturer, quantity) {

    if (!name || !description || !sku || !manufacturer || !quantity || typeof quantity === "string" || quantity<0 || quantity>100 || typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string") return false;
    else return true;
}

function product_put_validation(name, description, sku, manufacturer, quantity){
    if (name===""|| description === "" || sku === "" || manufacturer === "" || quantity === "" || typeof quantity === "string"|| quantity<0 || quantity>100 || typeof name !== "string" || typeof description !== "string" || typeof sku !== "string" || typeof manufacturer !== "string") return false;
    else return true;
}

const post_Product = async(request, response) =>{
    if(!request.headers.authorization){
        statsd.increment('postprodnoauth')
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
                        statsd.increment('postprodskuexists')
                        response.status(400).send({
                            message: "sku already exists",
                        })
                    }
                    else if(!product_post_validation(name, description, sku, manufacturer, quantity)){
                        statsd.increment('postprodinvalid')
                        response.status(400).send({ message: "Invalid entry or no entry!" }); 
                    }
                    else if(date_added||date_last_updated||owner_user_id){
                        statsd.increment('postprodinvalid')
                        response.status(400).send({message: "Invalid entries!"})
                    } 
                        
                    else if(quantity<0 || quantity>100){
                        statsd.increment('postprodinvalid')
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
                                statsd.increment('postprod')
                                response.status(201).send({
                                    id : ack.getDataValue("id"),
                                    name : ack.getDataValue("name"),
                                    description : ack.getDataValue("description"),
                                    sku : ack.getDataValue("sku"),
                                    manufacturer : ack.getDataValue("manufacturer"),
                                    quantity : ack.getDataValue("quantity"),
                                    date_added : ack.getDataValue("createdAt"),
                                    date_last_updated : ack.getDataValue("updatedAt"),                                        
                                    owner_user_id : ack.getDataValue("owner_user_id")
                                    });  
                                })
                                .catch(() => {
                                    statsd.increment('postprodbadrequest')
                                    response.status(400).send({
                                        message: "Bad Request",
                                    });
                                });
                        }           
                    }
                    else{
                        statsd.increment('postprodwrongpass')
                        response.status(401).send({
                            message: "Wrong Password!",
                        });
                    }
            }
            else{
                statsd.increment('postprodinvalid')
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
        statsd.increment('getprodinvalid')
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
                statsd.increment('getprod')
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
                statsd.increment('getprodinvalid')
                response.status(404).send({
                    message:"Id unavailable"
                })
            }
        })
        .catch(()=>{
            statsd.increment('getprodbadreq')
            response.status(400).send({
                message:"Bad request "
            })
        })
    }
};

const put_Product = async(request,response)=>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        statsd.increment('putprodnoauth')
        response.status(400).send({
        message:"No Auth",
    });
    }
    else if(!id || typeof id === "string"){
        statsd.increment('putprodinvalid')
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
            statsd.increment('putprodinvalid')
            response.status(400).send({
                message: "Check and give the necessary details!",
            });
        }
        else if (date_added || date_last_updated || owner_user_id){
            statsd.increment('putprodinvalid')
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
                            statsd.increment('putprodinvalid')
                            response.status(404).send({
                                message: "Cannot find the product!",
                            })
                        }
                        else if (product.getDataValue("owner_user_id")!== user.getDataValue("id")){
                            statsd.increment('putprodinvalid')
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
                                statsd.increment('putprod')
                                response.status(204).send({
                                });
                            })
                            .catch(() => {
                                statsd.increment('putprodinvalid')
                                response.status(400).send({
                                    message: "Bad Request. Check the details to update!",
                                });
                            })
                        } else{
                                statsd.increment('putprodinvalid')
                                response.status(400).send({
                                message: "Check the respective user!",
                                });}
                    })
                } 
                else{
                    statsd.increment('putprodinvalid')
                    response.status(401).send({
                    message: "Check the Password!",
                });
                }}
            )
            .catch(()=>{
                statsd.increment('putprodinvalid')
                response.status(401).send({
                    message: "Check the User ID!",
                })
            })
        }
    }
};

const patch_Product = async(request,response)=>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        statsd.increment('patchprodnoauth')
        response.status(400).send({
        message:"No Auth",
    });
    }
    else if(!id || typeof id === "string"){
        statsd.increment('patchprodinvalid')
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
            statsd.increment('patchprodinvalid')
            response.status(400).send({
                message: "Check and give the necessary details!",
            });
        }else if (date_added || date_last_updated || owner_user_id){
            statsd.increment('patchprodinvalid')
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
                            statsd.increment('patchprodinvalid')
                            response.status(404).send({
                                message: "Cannot find the product!",
                            })
                        }
                        else if (product.getDataValue("owner_user_id")!== user.getDataValue("id")){
                            statsd.increment('patchprodinvalid')
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
                                statsd.increment('patchprodinvalid')
                                response.status(204).send({
                                });
                            })
                            .catch(() => {
                                statsd.increment('patchprodinvalid')
                                response.status(400).send({
                                    message: "Bad Request. Check the details to update!",
                                });
                            })
                        } else{
                            statsd.increment('patchprodinvalid')
                            response.status(400).send({
                            message: "Check the respective user!",
                            });}
                    })
                } 
                else{
                    statsd.increment('patchprodinvalid')
                    response.status(401).send({
                    message: "Check the Password!",
                });
                }}
            )
            .catch(()=>{
                statsd.increment('patchprodinvalid')
                response.status(401).send({
                    message: "Check the User ID!",
                })
            })
        }
    }
};

const delete_Product = async(request, response) =>{
    const id = Number(request.params.id);
    if (!request.headers.authorization){
        statsd.increment('patchprodinvalid')
        response.status(400).send({
            message:"No Auth",
        });
    }
    else if(!id || typeof id === "string"){
        statsd.increment('patchprodinvalid')
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
                        statsd.increment('patchprodinvalid')
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
                            statsd.increment('patchprod')
                            response.status(204).send({})
                        }
                    })
                }
                })
            .catch((val)=>{
                console.log(val)
                statsd.increment('patchprodinvalid')
                response.status(404).send({
                    message: "Cannot find the product!",
                })
            })
            }   
        else{
            statsd.increment('patchprodinvalid')
            response.status(401).send({
                message: "Check the credentials!",
              })   
        }
    })
    .catch(()=>{
        statsd.increment('patchprodinvalid')
        response.status(400).send({
            message: "Bad Request",
        })
    })
}
};

const s3 = new AWS.S3({
    
    aws_region: process.env.AWS_REGION,
});
  
const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '');
    },
});
  
const upload = multer({ storage }).single('image');
const upload_Image = (req, res) => {
    const id = Number(req.params.productId);
    if (!req.headers.authorization) {
        statsd.increment('upimgnoauth')
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
        statsd.increment('upimginvalid')
        res.status(400).send({
        message: "Check ID!",
    });
    } else {
        const encodedToken = req.headers.authorization.split(" ")[1];
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
      
        Product.findOne({
            where: {
                id: id,
            },
        }).then(async (product) => {
            User.findOne({
            where: {
                id: product.getDataValue("owner_user_id"),
            },
            }).then(async (user) => {
                const valid = await bcrypt.compare(
                decodedPassword,
                user.getDataValue("password")
                );
                const existing_user = await User.findOne({ where: {
                    username: decodedUsername,
                },
                });
                if (valid && user.getDataValue("username") === decodedUsername) {
                    upload(req, res, function (err) {
                        if (err) {
                            statsd.increment('upimginvalid')
                            return res.status(400).json({ message: err.message });
                        }
  
                        const image_Data = req.file.buffer;
                        const image_Name = `${uuidv4()}-${req.file.originalname}`;
                        const fileTypes = /jpeg|jpg|png/;
                        if(!fileTypes.test(image_Name.toLowerCase()))
                        {
                            statsd.increment('upimginvalid')
                            return res.status(401).json({ message: "Check the input!" });
                        }
                        const aws_bucketName = process.env.AWS_BUCKET_NAME;

                        const params = {
                            Bucket: aws_bucketName,
                            Key: image_Name,
                            Body: image_Data,
                            ContentType: req.file.mimetype,
                        };
                        s3.upload(params, (err, data) => {
                            if (err) {
                                statsd.increment('upimginvalid')
                                return res.status(400).json({ message: err.message });
                            }
  
                            const imageUrl = data.Location;
                
                            const params = {
                                Bucket: aws_bucketName,
                                Key: image_Name,
                            };
                            s3.headObject(params, function (err, metadata) {
                  
                                if (err) {
                                    statsd.increment('upimginvalid')
                                    return res.status(400).json({ message: err.message });
                                }
                                Image.create({
                                    product_id: id,
                                    file_name:image_Name,
                                    s3_bucket_path:imageUrl,
                                    createdAt: new Date(),     
                                })
                                .then((feedback)=>{
                                    statsd.increment('upimg')
                                    res.status(201).send({
                                        product_id: feedback.getDataValue("product_id"),
                                        file_name: feedback.getDataValue("file_name"),
                                        s3_bucket_path: feedback.getDataValue("s3_bucket_path"), 
                                        date_added:feedback.getDataValue("createdAt"),
                                    });
                                })
                            });
                        });
                    });
                }
          
                else if(existing_user){
                    statsd.increment('upimginvalid')
                    res.status(403).send({
                        message: "Access denied!",
                    });
                }
                else{
                    statsd.increment('upimginvalid')
                    res.status(401).send({
                        message: "Check the ID!",
                    });
                }
            })
            .catch(()=> {
                statsd.increment('upimginvalid')
                res.status(401).send({
                    message: "Check the ID!",
                });
            });
        }).catch(() => {
            statsd.increment('upimginvalid')
            res.status(401).send({
                message: "Check the ID!",
            });
        });
    }
};

const delete_Image = (req, res) => {
    const id = Number(req.params.imageId);
    const productID = Number(req.params.productId);
    if (!req.headers.authorization) {
        statsd.increment('delimgnoauth')
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
        statsd.increment('delimginvalid')
        res.status(400).send({
            message: "Check ID!",
        });
    } else {
        const encodedToken = req.headers.authorization.split(" ")[1];
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
  
        Image.findOne({
            where: {
                id: id,
            },
        })
        .then(async (image) => {
            Product.findOne({
                where: {
                    id: image.getDataValue("product_id"),
                },
            })
            .then(async (product) => {
                User.findOne({
                    where: {
                        id: product.getDataValue("owner_user_id"),
                    },
                })
                .then(async (user)=>{
                    if(product.getDataValue("id")!==productID){
                        statsd.increment('delimginvalid')
                        return res.status(400).json({ message: "Check the product ID!" })
                    }
                    if (!product) {
                        console.log(product)
                        statsd.increment('delimginvalid')
                        return res.status(400).json({ message: "Check the product ID!" });
                    } else {
                        const valid = await bcrypt.compare(decodedPassword, user.getDataValue("password") );
                        if (valid === true && decodedUsername === user.getDataValue("username")) {
                            const aws_bucketName = process.env.AWS_BUCKET_NAME;;
                            const params = {
                                Bucket: aws_bucketName,
                                Key: image.getDataValue("file_name"),
                            };
                            s3.deleteObject(params, function (err, data) {
                                if (err) {
                                    statsd.increment('delimginvalid')
                                    return res.status(400).json({ message: err.message });
                                }
                                Image.destroy({
                                    where: {
                                        id: id,
                                    },
                                })
                                .then(() => {
                                    statsd.increment('delimg')
                                    return res.status(200).json({ message: "Deleted the image successfully" });
                                })
                                .catch(() => {
                                    statsd.increment('delimginvalid')
                                    return res.status(500).json({ message: "S3 error!" });
                                });
                            });
                        } else {
                            statsd.increment('delimginvalid')
                            return res.status(403).json({ message: "Access denied!" });
                        }
                    }
                })
            })
            .catch(() => {
                statsd.increment('delimginvalid')
                return res.status(400).json({ message: "Check the product ID!" });
            });
        })
        .catch(() => {
            statsd.increment('delimginvalid')
            return res.status(404).json({ message: "Check the product ID!" });
        });
    }
};
  
const get_Image = (req, res) => {
    const id = Number(req.params.imageId);
    const productID = Number(req.params.productId)
    if (!req.headers.authorization) {  
        statsd.increment('getimgnoauth')
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
        statsd.increment('getimginvalid')
        res.status(400).send({
            message: "Check ID!",
        });
    } else {
        const encodedToken = req.headers.authorization.split(" ")[1];
        const baseToAlpha = base64.decode(encodedToken).split(":");
        let decodedUsername = baseToAlpha[0];
        let decodedPassword = baseToAlpha[1];
        Image.findOne({
            where: {
                id: id,
            },
        })
        .then(async (image) => {
            Product.findOne({
                where: {
                    id: image.getDataValue("product_id"),
                },
            })
            .then(async (product) => {
                if(product.getDataValue("id")!==productID){
                    statsd.increment('getimginvalid')
                    return res.status(400).json({ message: "Check the product ID!" })
                }
                User.findOne({
                    where: {
                        id: product.getDataValue("owner_user_id"),
                    },
                })
                .then(async (user)=>{
                    if (!product) {
                        console.log(product)
                        statsd.increment('getimginvalid')
                        return res.status(400).json({ message: "Check the product ID!" });
                    } else {
                        const valid = await bcrypt.compare(decodedPassword, user.getDataValue("password") );
                        if (valid === true && decodedUsername === user.getDataValue("username")) {
                            statsd.increment('getimg')
                            return res.status(200).json({
                                id: image.getDataValue("id"),
                                product_id: image.getDataValue("product_id"),
                                file_name: image.getDataValue("file_name"),
                                created_at: image.getDataValue("createdAt"),
                                updated_at: image.getDataValue("updatedAt"),
                            });
                        } else {
                            statsd.increment('getimginvalid')
                            return res.status(403).json({ message: "Access denied!" });
                        }
                    }
                })
            })
            .catch(() => {
                statsd.increment('getimginvalid')
                return res.status(400).json({ message: "Check the product ID!" });
            });
        })
        .catch(() => {
            statsd.increment('getimginvalid')
            return res.status(400).json({ message: "Check the image ID!" });
        });
    }
};
  
  
  const get_Images_By_ProdId = (req, res) => {
    const productId = Number(req.params.productId);
  
    if (!req.headers.authorization) {
        statsd.increment('getimgbyprodinvalid')
        return res.status(401).json({ message: "Unauthorized Access!" });
    }
  
    const token = req.headers.authorization.split(" ")[1];
    const [username, password] = Buffer.from(token, "base64").toString().split(":");
  
    User.findOne({ where: { username } })
      .then(async (user) => {
        if (!user) {
          statsd.increment('getimgbyprodinvalid')
          return res.status(401).json({ message: "Unauthorized Access!" });
        }
  
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          statsd.increment('getimgbyprodinvalid')
          return res.status(401).json({ message: "Unauthorized Access!" });
        }
  
        Product.findByPk(productId).then((product) => {
          if (!product) {
            statsd.increment('getimgbyprodinvalid')
            return res.status(404).json({ message: "Cannot find the product!" });
          }
          else if(product.getDataValue("owner_user_id")!==user.getDataValue("id")){
            statsd.increment('getimgbyprodinvalid')
            return res.status(403).json({ message: "Access denied!" });
          }
  
          Image.findAll({ where: { product_id: productId } })
            .then((images) => {
              statsd.increment('getimgbyprod')
              return res.status(200).json({ images });
            })
            .catch((error) => {
              console.log(error);
              statsd.increment('getimgbyprodinvalid')
              return res.status(500).json({ message: "Server Error!" });
            });
        });
      })
      .catch((error) => {
        console.log(error);
        statsd.increment('getimgbyprodinvalid')
        return res.status(500).json({ message: "Server Error!" });
      });
  };
  
module.exports = {post_Product, get_Product, put_Product, patch_Product, delete_Product, upload_Image, delete_Image, get_Image, get_Images_By_ProdId};