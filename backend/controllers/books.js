const Book = require('../models/Book');
const fs = require('fs');
const sharp = require('sharp');

const convertImageToWebP2 = async (inputPath, outputPath, callback) => {
  await sharp(inputPath)
    .webp({ quality: 90 })
    .toFile(outputPath, (err, info) => {
      if (err) {
        console.error(err);
        return callback(err);
      }
      // Supprimer le fichier d'origine après la conversion
      fs.unlink(inputPath, (err) => {
        if (err) {
          console.error(err);
          return callback(err);
        }
        callback(null, info);
      });
    });
};

exports.createBook = (req, res, next) => {
  const bookObject = JSON.parse(req.body.book);
  delete bookObject._id; // On supprime l'id du post parce que sinon ça va pas matcher avec le fichier Book.js
  delete bookObject._userId;

  convertImageToWebP2(req.file.path, `${req.file.path}.webp`, (err, info) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "Erreur lors de la conversion de l'image" });
    }

    const book = new Book({
      ...bookObject, // L'opérateur spread ... est utilisé pour faire une copie de tous les éléments de bookObject (req.body moins les deux champs supprimés). 
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}.webp`, // On génère l'URL avec le protocole, le nom d'hôte, et la route avec le nom du fichier donné par multer
    });

    book
      .save() // La méthode save enregistre l'objet dans la base, et retourne un promise.
      .then(() => { // On renvoie une réponse de réussite avec un code 201 de réussite.
        res
          .status(201)
          .json({ message: "Objet enregistré !", imageUrl: book.imageUrl });
      })
      .catch((error) => {
        res.status(400).json({ error });
      });
  });
};

exports.modifyBook = (req, res, next) => { 
  const bookObject = req.file // On crée un objet bookObject qui regarde si la requête est faite avec un fichier (req.file) ou pas.
    ? {
        ...JSON.parse(req.body.book), // S'il existe, on traite la nouvelle image. On récupère l'objet en parsant la chaine de caractère...
        imageUrl: `${req.protocol}://${req.get("host")}/images/${req.file.filename}.webp`, // Et en recréant l'url de l'image comme pour le post.
      }
    : { ...req.body }; // S'il n'y a pas d'objet de transmis, on récupère l'objet dans le corps de la requête.

  delete bookObject._userId; // on supprime l'userID provenant de la requête pour pas qu'il le modifie en le réassignant à un autre user
  Book.findOne({ _id: req.params.id }) // On cherche l'objet dans notre bdd pour vérifier si c'est bien l'utilisateur qui a créé l'objet qui veut le modifier.
    .then((book) => {
      if (book.userId != req.auth.userId) { // Si ça match pas, erreur
        res.status(401).json({ message: "Not authorized" }); 
      } else { // Si ça marche, on met à jour notre enregistrement
        
        // Supprimer l'ancienne image si elle existe
        if (book.imageUrl) { // Si le livre présent dans la bdd a une url d'image
          
          const filename = book.imageUrl.split("/images/")[1]; // On utilise split comme dans la fonction delete pour recréer le chemin dans notre système de fichier à partir de l'url de l'ancienne image
          fs.unlink(`images/${filename}`, (err) => { // On utilise la méthode unlink de fs (file system, un package node) avec notre chemin pour supprimer l'ancienne image
            if (err) {
              console.error(err);
            }
          });
        }
        
        // La méthode updateOne permet de modifier un Thing dans la bdd. 
        Book.updateOne(
          { _id: req.params.id }, // On commence par comparer les id pour savoir quel objet on modifie.
          { ...bookObject, _id: req.params.id } // Le deuxième argument, { ...req.body, _id: req.params.id }, est la nouvelle version de l'objet, et on s'assure que l'id est bien celui qui est dans le corps de la requête.
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
    Book.findOne({ _id: req.params.id }) // On utilise findOne() dans notre modèle Book pour trouver le Book unique ayant le même _id que le paramètre de la requête
      .then(book => res.status(200).json(book)) // On retourne au front-end une réponse 200 avec le book dedans
      .catch(error => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
    Book.find() // On utilise la méthode find() dans notre modèle Mongoose afin de renvoyer un tableau contenant tous les Book dans notre base de données
      .then(books => res.status(200).json(books))
      .catch(error => res.status(400).json({ error }));
};

exports.bestRating = async (req, res, next) => {
  try {
    const books = await Book.find() // On cherche tous les livres
      .sort({ averageRating: -1 }) // On les trie par ordre décroissant en fonction de leur averageRating
      .limit(3) // On limite à 3

    res.status(200).json(books)
  } catch (error) {
    res.status(500).json({ error })
  }
}

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) { // On vérifie l'id comme pour le modify
        res.status(401).json({ message: "Not authorized" });
      } else { // Si c'est le bon utilisateur, on supprime l'objet de la bdd, et l'image du système de fichier
        const filename = book.imageUrl.split("/images/")[1]; // On récupère l'url enregistrée, et on recrée le chemin dans notre système de fichier à aprtir de celle-ci (l'inverse du post)
        fs.unlink(`images/${filename}`, () => { // On utilise la méthode unlink de fs (file system, un package node) avec notre chemin pour supprimer l'ancienne image du serveur.
          Book.deleteOne({ _id: req.params.id }) // On utilise la méthode deleteOne et on fait comme pour les autres.
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

    // Vérification que l'ID de l'utilisateur dans la requête correspond à l'ID de l'utilisateur authentifié
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
      const allRatings = book.ratings.map((rating) => rating.grade); // On extrait toutes les notes (grade) des évaluations existantes (book.ratings) pour le livre donné. On utilise map() pour parcourir chaque évaluation et récupérer la note correspondante.
      const averageRating =
        allRatings.reduce((acc, curr) => acc + curr, 0) / allRatings.length; // On calcule la note moyenne : la méthode reduce permet d'additionner toutes les notes. acc conserve l'accumulation des notes, et à chaque id on y ajoute une nouvelle note avec curr
      const newAverageRating = averageRating.toFixed(1); // On utilise la méthode toFixed pour arrondir la note à 1 décimale après la virgule

      // Mise à jour du livre avec les nouveaux champs de note et de note moyenne
      await Book.updateOne(
        { _id: req.params.id },
        {
          ratings: book.ratings,
          averageRating: newAverageRating,
          _id: req.params.id,
        },
        { new: true } // On demande à mongoDB de renvoyer le document mis à jour après la modification.
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