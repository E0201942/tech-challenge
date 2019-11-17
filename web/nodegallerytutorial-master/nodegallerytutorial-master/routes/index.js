var express = require('express');
var router = express.Router();
var controller = require('../controller');

/* GET home page. */
router.get('/', controller.home);

router.get('/login', controller.login);

router.get('/logout', controller.logout);

router.get('/oauthredirect',controller.oauthredirect);

router.get('/createfolder', controller.createfolder);

router.get('/delete', controller.delete);

router.get('/upload', controller.upload);

module.exports = router;
