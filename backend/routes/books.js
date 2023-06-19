const express = require("express");
const router = express.Router();
const bookCtrl = require('../controllers/books');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config');

  router.post('/', auth, multer, bookCtrl.createBook);
  router.get('/bestrating', bookCtrl.bestRating);
  router.get('/:id', bookCtrl.getOneBook);
  router.put('/:id', auth, multer, bookCtrl.modifyBook);
  router.delete('/:id', auth, bookCtrl.deleteBook);
  router.get('/', bookCtrl.getAllBooks);
  router.get('/toto', bookCtrl.toto);
  router.post('/:id/rating', auth, bookCtrl.rateOneBook);

  module.exports = router;