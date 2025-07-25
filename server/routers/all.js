const express = require('express')
const router = express.Router()

const {saveData, getData} = require('../controllers/saveController')
router.route('/').post(saveData).get(getData);

module.exports = router;