const express = require('express');

const router = express.Router();
const { getStatus, getStats } = require('../controllers/AppController');
const { postNew } = require('../controllers/UsersController');

router.get('/status', getStatus);

router.get('/stats', getStats);

router.post('/users', postNew);

module.exports = router;
