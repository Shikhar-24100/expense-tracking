const express = require('express')
const router = express.Router()

const {saveData, getData, deleteData} = require('../controllers/saveController')
router.route('/').post(saveData).get(getData);
router.route('/:type/:id').delete(deleteData);

module.exports = router;