const express = require("express");
const {healthCheck,create_User, get_User, update_User} =require( '../controllers/usersData.js');

const router = express.Router();

router.route('/v1/user')
      .post(create_User)

router.route('/v1/user/:id')
      .get(get_User)
      .put(update_User)

router.route('/healthz')
      .get(healthCheck)

module.exports=router