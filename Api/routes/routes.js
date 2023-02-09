const express = require("express");
const {healthCheck,create_User, get_User, update_User} =require( '../controllers/usersData.js');
const { post_Product, get_Product, put_Product, patch_Product, delete_Product } = require("../controllers/productData.js");

const router = express.Router();

router.route('/v1/user')
      .post(create_User)

router.route('/v1/user/:id')
      .get(get_User)
      .put(update_User)

router.route('/healthz')
      .get(healthCheck)

router.route('/v1/product')
      .post(post_Product)

router.route('/v1/product/:id')
      .delete(delete_Product)
      .get(get_Product)
      .put(put_Product)
      .patch(patch_Product)
      
module.exports=router