const base64 = require("base-64");
const bcrypt = require("bcrypt");
const {User} = require("../models/model.js");

function putvalidation(id, password, first_name, last_name) {
  if (!id || !password || !first_name || !last_name) return false;
  else return true;
}

function postvalidation(username, password, first_name, last_name) {
  const emailRegex =new RegExp(/^[A-Za-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[A-Za-z0-9.-]+$/, "gm");
  const isValidEmail = emailRegex.test(username);
  if (!username || !password || !first_name || !last_name) return false;
  else if(!isValidEmail)return false;
  else return true;
}

const get_User = async (request, response) => {
  let authheader = request.headers.authorization;
  if (!authheader) {
    response.status(400).send({
      message: "No Auth",})
  }
  let auth = new Buffer.from(authheader.split(" ")[1], "base64").toString().split(":");
  let username = auth[0];
  let password = auth[1];

  User.findOne({ where: { username: username } }).then((user) => {
    if (user.id == request.params.id) {
      bcrypt.compare(password, user.password).then((flag) => {
        if (flag) {
          User.findByPk(request.params.id).then((user) => {
            const data = {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                account_created: user.createdAt,
                account_updated: user.updatedAt,
            }
            response.status(200).json({
              success: true,
              data: data
            });
          });
        } else {
            response.status(401).send({ 
              message: "Authentication Failed! Wrong Password" });
          }
      })
      .catch((err) => {
        response.status(400).send({ 
          message: "Authentication Failed!" 
        });
      });
    } else {
        response.status(403).send({ 
          message: "Cannot see other user details!" 
        });
      }
  })
  .catch((err) => {
    response.status(400).send({ 
      message: "Authentication Failed!" 
    });
  });
};
const create_User = async (request, response) => {
  let { username, password, first_name, last_name } = request.body;
  if (!postvalidation(username, password, first_name, last_name)) {
    response.status(400).send({ message: "Invalid entry" });
  } else {
    const salt = await bcrypt.genSalt(10);
    let encrypt = await bcrypt.hash(password, salt);
    User.findOrCreate({
      where: { username },
      defaults: {
        username: username,
        password: encrypt,
        first_name: first_name,
        last_name: last_name,
        account_created: new Date(),
        account_updated: new Date(),
      },
    })
      .then(([acknowledgement, stat]) => {
        if (stat) {
          response.status(201).send({
            id: acknowledgement.getDataValue("id"),
            username: acknowledgement.getDataValue("username"),
            first_name: acknowledgement.getDataValue("first_name"),
            last_name: acknowledgement.getDataValue("last_name"),
            account_created: acknowledgement.getDataValue("createdAt"),
            account_updated: acknowledgement.getDataValue("updatedAt"),
          });
        } else {
          response.status(400).send({ message: "Username Exists!" });
        }
      })
      .catch(() => {
        response.status(400).send({
          message: "Bad Request",
        });
      });
  }
};
const update_User = async (request, response) => {
  const id = Number(request.params.id);
  if(!request.headers.authorization){
    response.status(400).send({
      message: "No Auth",
    })
  }
  else{
    const encodedToken = request.headers.authorization.split(" ")[1];
    const {
      username,
      first_name,
      last_name,
      account_created,
      account_updated,
      password,
    } = request.body;
    const baseToAlpha = base64.decode(encodedToken).split(":");
    let decodedUsername = baseToAlpha[0];
    let decodedPassword = baseToAlpha[1];
    if (username || account_created || account_updated) {
      response.status(400).send({
      message: "Bad Request. Cannot update",
    });
    } else if (putvalidation(id, password, first_name, last_name) === false) {
        response.status(400).send({ message: "Wrong Inputs" });
      } 
      else {
        User.findOne({
          where: {
            id: id,
          },
        })
        .then(async (user) => {
          if (user) {
            const valid = await bcrypt.compare(decodedPassword,user.getDataValue("password"));
            if (valid === true && decodedUsername === user.getDataValue("username")){
              const salt = await bcrypt.genSalt(10);
              let hash = await bcrypt.hash(password, salt);
              User.update({
                password: hash,
                first_name: first_name,
                last_name: last_name,
                account_updated: new Date(),
              },
              {
                where: {
                  id: id,
                  username: decodedUsername,
                },
              })
                .then((result) => {
                  response.status(204).send({});
                })
                .catch(() => {
                  response.status(400).send({
                  message: "Bad Request. Incorrect inputs for Update",
                  });
                });
                } 
                else if(id!==user.getDataValue("id")){
                  response.status(403).send({
                    message:"Forbidden Error"
                  })
                }
                else if (
                    valid === false ||
                    decodedUsername !== user.getDataValue("username")) 
                    {
                      response.status(401).send({ 
                        message: "User Authentication failed" 
                      });
                    }
            }
          });
        }}
};

const healthCheck = async (request, response) => {
  try {
    response.status(200).send({ message: "Health check completed successfully" });
  } catch (error) {
    response.status(404).send({ message: "Health check failed" });
  }
};

module.exports = { healthCheck, create_User, update_User,get_User};
