# CSYE6225 Network Structures and Cloud Computing Assignment-2

## Srikanth Chilaka - 002780059

## Aim
Build APIs for the web application for user to write and edit details using Node.js
## Features
As a user, I will be able to create an account by providing the following information.
    Email Address
    Password
    First Name
    Last Name

As a user, I will be able to update and get the account information after entering the credentials using basic auth.

As a user, I can also add products, update them respectively.
## Requirements

Node.js
Express.js
Sequelize
Bcrypt js
Base-64
Postman
Mocha
Supertest
Chai

## Steps for Execution
Run: node listener.js
Test: npm run test

### Retrieve User Details
GET /v1/user/:id

### Create User
POST /v1/user

### Update User by id
PUT /v1/user/:id

### Check health
GET /healthz

### Create Product
POST /v1/product

### Retrieve Product Details
GET /v1/product/:productID

### Update Product by id
PUT /v1/product/:productID
PATCH /v1/product/:productID

