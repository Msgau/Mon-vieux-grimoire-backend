const express = require("express");
const router = express.Router();
const bookCtrl = require('../controllers/books');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');
const convertImageToWebP = require("../middleware/sharp-config");

  router.post('/', auth, multer, convertImageToWebP, bookCtrl.createBook);
  router.get('/bestrating', bookCtrl.bestRating);
  router.get('/:id', bookCtrl.getOneBook);
  router.put('/:id', auth, multer, convertImageToWebP, bookCtrl.modifyBook);
  router.delete('/:id', auth, bookCtrl.deleteBook);
  router.get('/', bookCtrl.getAllBooks);
  router.post('/:id/rating', auth, bookCtrl.rateOneBook);

  module.exports = router;
