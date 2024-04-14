const express = require('express');

const router = express.Router();
const { getStatus, getStats } = require('../controllers/AppController');

router.get('/status', getStatus);

router.get('/stats', getStats);

module.exports = router;
