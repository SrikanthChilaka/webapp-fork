const {Product,User,Image} = require("../models/model.js");
const usersData = require("../controllers/usersData.js");
const base64 = require("base-64");
const bcrypt = require("bcrypt");
const {where} = require("sequelize");
const AWS = require("aws-sdk")
const multer = require("multer")
const multerS3 = require("multer-s3")
const { v4: uuidv4 } = require("uuid");

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
            .catch(()=>{
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
            .catch(()=>{
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

const s3 = new AWS.S3({
    // accessKeyId: 'AKIA3EFUIO4NLYYK34NL',
    // secretAccessKey: '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',
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
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
      // handle invalid id
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
                            return res.status(400).json({ message: err.message });
                        }
  
              // Image was successfully uploaded to memory buffer
                        const imageData = req.file.buffer;
                        const imageName = `${uuidv4()}-${req.file.originalname}`;
                        const fileTypes = /jpeg|jpg|png/;
                        if(!fileTypes.test(imageName.toLowerCase()))
                        {
                            return res.status(401).json({ message: "Check the input" });
                        }
                        const bucketName = process.env.AWS_BUCKET_NAME;
              
              // Upload the image to S3
                        const params = {
                            Bucket: bucketName,
                            Key: imageName,
                            Body: imageData,
                            ContentType: req.file.mimetype,
                        };
                        s3.upload(params, (err, data) => {
                            if (err) {
                                return res.status(400).json({ message: err.message });
                            }
  
                // Image was successfully uploaded to S3
                            const imageUrl = data.Location;
                
                // Get the metadata for the uploaded image
                            const params = {
                                Bucket: bucketName,
                                Key: imageName,
                            };
                            s3.headObject(params, function (err, metadata) {
                  
                                if (err) {
                                    return res.status(400).json({ message: err.message });
                                }
                                Image.create({
                          
                                    product_id: id,
                                    file_name:imageName,
                                    s3_bucket_path:imageUrl,
                                    createdAt: new Date(),     
                                })
                                .then((feedback)=>{
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
            
                    res.status(403).send({
                        message: "Access denied!",
                    });
                }
                else{
                    res.status(401).send({
                        message: "Check the ID",
                    });
                }
            })
            .catch(()=> {
                res.status(401).send({
                    message: "Check the ID",
                });
            });
        }).catch(() => {
            res.status(401).send({
                message: "Check the ID",
            });
        });
    }
};

const delete_Image = (req, res) => {
    const id = Number(req.params.imageId);
    const productID = Number(req.params.productId);
    if (!req.headers.authorization) {
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
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
                        return res.status(400).json({ message: "Check the product ID!" })
                    }
                    if (!product) {
                        console.log(product)
                        return res.status(400).json({ message: "Check the product ID!" });
                    } else {
                        const valid = await bcrypt.compare(decodedPassword, user.getDataValue("password") );
                        if (valid === true && decodedUsername === user.getDataValue("username")) {
                            const bucketName = process.env.AWS_BUCKET_NAME;;
                            const params = {
                                Bucket: bucketName,
                                Key: image.getDataValue("file_name"),
                            };
                            s3.deleteObject(params, function (err, data) {
                                if (err) {
                                    return res.status(400).json({ message: err.message });
                                }
                                Image.destroy({
                                    where: {
                                        id: id,
                                    },
                                })
                                .then(() => {
                                    return res.status(200).json({ message: "Deleted the image successfully" });
                                })
                                .catch(() => {
                                    return res.status(500).json({ message: "S3 error!" });
                                });
                            });
                        } else {
                            return res.status(403).json({ message: "Access denied!" });
                        }
                    }
                })
            })
            .catch(() => {
                return res.status(400).json({ message: "Check the product ID!" });
            });
        })
        .catch(() => {
            return res.status(404).json({ message: "Check the product ID!" });
        });
    }
};
  
const get_Image = (req, res) => {
    const id = Number(req.params.imageId);
    const productID = Number(req.params.productId)
    if (!req.headers.authorization) {  
        res.status(400).send({
            message: "No Auth",
        });
    } else if (!id || typeof id === "string") {
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
                        return res.status(400).json({ message: "Check the product ID!" });
                    } else {
                        const valid = await bcrypt.compare(decodedPassword, user.getDataValue("password") );
                        if (valid === true && decodedUsername === user.getDataValue("username")) {
                            return res.status(200).json({
                                id: image.getDataValue("id"),
                                product_id: image.getDataValue("product_id"),
                                file_name: image.getDataValue("file_name"),
                                created_at: image.getDataValue("createdAt"),
                                updated_at: image.getDataValue("updatedAt"),
                            });
                        } else {
                            return res.status(403).json({ message: "Access denied!" });
                        }
                    }
                })
            })
            .catch(() => {
                return res.status(400).json({ message: "Check the product ID!" });
            });
        })
        .catch(() => {
            return res.status(400).json({ message: "Check the image ID!" });
        });
    }
};
  
  
  const get_Images_By_ProdId = (req, res) => {
    const productId = Number(req.params.productId);
  
    if (!req.headers.authorization) {
      return res.status(401).json({ message: "Unauthorized Access!" });
    }
  
    const token = req.headers.authorization.split(" ")[1];
    const [username, password] = Buffer.from(token, "base64").toString().split(":");
  
    User.findOne({ where: { username } })
      .then(async (user) => {
        if (!user) {
          return res.status(401).json({ message: "Unauthorized Access!" });
        }
  
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ message: "Unauthorized Access!" });
        }
  
        Product.findByPk(productId).then((product) => {
          if (!product) {
            return res.status(404).json({ message: "Cannot find the product!" });
          }
          else if(product.getDataValue("owner_user_id")!==user.getDataValue("id")){
            return res.status(403).json({ message: "Access denied!" });
          }
  
          Image.findAll({ where: { product_id: productId } })
            .then((images) => {
              return res.status(200).json({ images });
            })
            .catch((error) => {
              console.log(error);
              return res.status(500).json({ message: "Server Error!" });
            });
        });
      })
      .catch((error) => {
        console.log(error);
        return res.status(500).json({ message: "Server Error!" });
      });
  
      
  };
  
module.exports = {post_Product, get_Product, put_Product, patch_Product, delete_Product, upload_Image, delete_Image, get_Image, get_Images_By_ProdId};