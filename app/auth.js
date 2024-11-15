var admin = require("firebase-admin");

var serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const firebaseAuthMiddleware = (exceptions) => {
  return (req, res, next) => {
    if (exceptions.includes(req.path)) {
      // No auth needed for exceptions.
      next();
      return;
    }
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No Bearer token provided.' });
    }

    const idToken = authorizationHeader.split('Bearer ')[1];
    
    admin.auth().verifyIdToken(idToken)
      .then((decodedToken) => {
        delete req.headers.authorization;
        req.headers['X-User-Id'] = decodedToken.uid;
        if (req.path === '/users/' && (req.method === 'POST' || req.method === 'PUT')) {
          req.body['email'] = decodedToken.email;
        }
        next();
      })
      .catch((error) => {
        console.error('Error verifying Firebase ID token:', error);
        return res.status(401).json({ error: 'Unauthorized.' });
      });
  }
}



const setupAuth = (app, routes) => {
  routes.forEach(r => {
    if (r.auth) {
      app.use(r.url, firebaseAuthMiddleware(r.authExceptions), function (req, res, next) {
        next();
      });
    }
  })
}


exports.setupAuth = setupAuth
