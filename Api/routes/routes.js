const express = require("express");
const {healthCheck,create_User, get_User, update_User} =require( '../controllers/usersData.js');
const { post_Product, get_Product, put_Product, patch_Product, delete_Product, upload_Image, delete_Image, get_Image, get_Images_By_ProdId } = require("../controllers/productData.js");

const router = express.Router();

router.route('/v1/user')
      .post(create_User)

router.route('/v2/user/:id')
      .get(get_User)
      .put(update_User)

router.route('/healthz')
      .get(healthCheck)
router.route('/health')
      .get(healthCheck)

router.route('/v1/product')
      .post(post_Product)

router.route('/v1/product/:id')
      .delete(delete_Product)
      .get(get_Product)
      .put(put_Product)
      .patch(patch_Product)

router.route('/v1/product/:productId/image')
      .post(upload_Image)
      .get(get_Images_By_ProdId)
router.route('/v1/product/:productId/image/:imageId')
      .delete(delete_Image)
      .get(get_Image)

module.exports=router
