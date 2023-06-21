const jwt = require('jsonwebtoken');
 
module.exports = (req, res, next) => {
   try {
       const token = req.headers.authorization.split(' ')[1];
       const decodedToken = jwt.verify(token, 'ygpLuJPuckx7yIADnymAempUrPyYKx7cEitJtfqOWy4IjdftGoTXLawh3I20wUfRIL3qQXXpXMNBikVSm8JaYwtXXK7OZZNKdI6l');
       const userId = decodedToken.userId;
       req.auth = {
           userId: userId
       };
	next();
   } catch(error) {
       res.status(401).json({ error });
   }
};