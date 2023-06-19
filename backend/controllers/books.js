const Book = require('../models/Book');
const fs = require('fs');

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id;
  delete bookObject._userId;
  const book = new Book({
    ...bookObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
  });

  book
    .save()
    .then(() => {
      res.status(201).json({ message: "Objet enregistré !" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.modifyBook = (req, res, next) => {
  const bookObject = req.file
    ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

  delete bookObject._userId;
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        Book.updateOne(
          { _id: req.params.id },
          { ...bookObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié!" }))
          .catch((error) => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.getOneBook = (req, res, next) => {
  console.log(Book)
    Book.findOne({ _id: req.params.id })
      .then(book => res.status(200).json(book))
      .catch(error => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
  console.log("test");
    Book.find()
      .then(books => res.status(200).json(books))
      .catch(error => res.status(400).json({ error }));
};

exports.bestRating = (req, res, next) => {
  try {
    const books = Book.find()
      .sort({ averageRating: -1 }) // Tri des livres par ordre décroissant de la note moyenne
      .limit(3) // Limite le nombre de livres renvoyés à 3

    res.status(200).json(books)
  } catch (error) {
    res.status(500).json({ error })
  }
}

exports.toto = (req, res, next) => {
  const books = Book.find().sort({ averageRating: -1 }).limit(3);
  res.send(books);
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Book.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Objet supprimé !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};
 
exports.rateOneBook = async (req, res) => {
  try {
    const book = await Book.findOne({ _id: req.params.id });

    // Vérification de l'user
    const user = req.body.userId;
    if (user !== req.auth.userId) {
      res
        .status(403)
        .json({ error: "Vous ne pouvez pas voter pour ce livre." });
      return;
    }

    // On crée l'objet de nouvelle note
    const newRatingObject = {
      userId: req.auth.userId,
      grade: req.body.rating,
    };

    // On check si y'a pas déjà un vote de l'user sur ce livre
    const hasUserVoted = book.ratings.find(
      (rating) => rating.userId === req.auth.userId
    );
    if (!hasUserVoted) {
      // On ajoute la nouvelle note dans le tableau avec push
      book.ratings.push(newRatingObject);

      // On calcule averageRating en fonction de toutes les notes.
      const allRatings = book.ratings.map((rating) => rating.grade);
      const averageRating =
        allRatings.reduce((acc, curr) => acc + curr, 0) / allRatings.length;
      const newAverageRating = averageRating.toFixed(1);

      // Mise à jour du livre avec les nouveaux champs de note et de note moyenne
      await Book.updateOne(
        { _id: req.params.id },
        {
          ratings: book.ratings,
          averageRating: newAverageRating,
          _id: req.params.id,
        },
        { new: true }
      );

      // Recherche du livre mis à jour pour obtenir les dernières valeurs
      const updatedBook = await Book.findOne({ _id: req.params.id });

      // Réponse avec le livre mis à jour
      res.status(200).json(updatedBook);
    } else {
      res.status(403).json({ error: "Vous avez déjà voté pour ce livre" });
    }
  } catch (error) {
    res.status(500).json({ error });
  }
};