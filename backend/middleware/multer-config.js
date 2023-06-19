const multer = require("multer"); // On impoirte multer pour pouvoir l'utiliser

const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// On crée un objet de configuraiton pour multer
const storage = multer.diskStorage({ // la fonction diskstorage dit qu'on va l'enregistrer sur le disque
  destination: (req, file, callback) => { // On explique à multer dans quel dossier on enregistre les fichiers
    callback(null, "images");
  },
  filename: (req, file, callback) => { // 
    const name = file.originalname.split(" ").join("_"); // On génère un nouveau nom pour le fichier pour le rendre le plus unique possible : 
                                                        // nom d'origine (originalname) dans lequel on remplace les " " par des "_"
    const extension = MIME_TYPES[file.mimetype]; // On crée l'extension du fichier. On récupère son midtype (image/jpg par exemple), et à partir de ça on génère l'extension du fichier.
    callback(null, name + Date.now() + "." + extension); // On appelle le callback, on crée le filename entier : le nom, le timestamp (date.now), un ".", et l'extension du fichier.
  },
});

module.exports = multer({ storage: storage }).single("image"); // On exporte l'élément multer entièrement configuré, avec la constante storage 
                                                            // et lui indiquons que nous gérerons uniquement les dl de fichiers image.
