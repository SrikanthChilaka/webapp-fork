# CSYE6225 Network Structures and Cloud Computing Assignment-9

## Srikanth Chilaka - 002780059

## Aim
Building Custom Application AMI using Packer
Build APIs for the web application for user to write and edit details using Node.js
Continuous Integration adds new GitHub Actions Workflow for Web App
## Features
As a user, I will be able to use Amazon Linux 2 as the source image to create a custom AMI using Packer.

As a user, I will be able to create an account by providing the following information.
    Email Address
    Password
    First Name
    Last Name

As a user, I will be able to update and get the account information after entering the credentials using basic auth.

As a user, I can also add products, update them respectively.

As a user, I can upload images to the products that are created.

Setup Autorun Using Systemd

Updated the packer template to install the Unified CloudWatch Agent in the AMI

The CloudWatch agent must be set up to start automatically when an EC2 instance is launched using the AMI
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
Packer
Terraform
AWS CLI
StatsD
Morgan

## Steps for Execution
When a pull request is merged, the GitHub Actions workflow will be triggered.

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

### Delete Product by id
DELETE /v1/product/:productID

### Create Image
POST /v1/product/:productId/image

### Retrieve Product Image Details
GET /v1/product/:productId/image

### Retrieve Image Details
GET /v1/product/:productId/image/:imageId

### Delete Image
DELETE /v1/product/:productId/image/:imageId

### Command to import the certificate 
Requested an SSL certificate from Namecheap, imported it into AWS Certificate Manager from the CLI, and then configured the load balancer to use the imported certificate
aws acm import-certificate --certificate fileb://prod_srikanthchilaka_me.pem --certificate-chain fileb://prod_srikanthchilaka_me_ca_bundle.pem --private-key fileb://private_key.pem --profile demo
