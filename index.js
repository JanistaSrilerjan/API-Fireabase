var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var cors = require('cors');
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

var config = require('./config.js');
var port = process.env.PORT || config.port;
var hostname = config.hostname;

var firebase = require('firebase');
var admin = require('firebase-admin');
const firebaseApp = firebase.initializeApp(config);
var data = firebaseApp.database().ref();
var db = firebase.database();
var serviceAccount = require('./test-pj-92383-firebase-adminsdk-dmmav-668d0462ec.json');

var jwt = require('jsonwebtoken');
var md5 = require('md5');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://test-pj-92383.firebaseio.com'
});

app.get('/', function (req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/user', function (req, res) {

  data.once("value", function (snapshot) {
    res.json(snapshot);
  });

});
app.get('create/:uid', function (req, res) {
  var uid = req.body.uid;
  admin.auth().getUser(uid)
    .then(function (userRecord) {
      // See the UserRecord reference doc for the contents of userRecord.
      console.log("Successfully fetched user data:", userRecord.toJSON());
    })
    .catch(function (error) {
      console.log("Error fetching user data:", error);
    });
});

app.get('/alluser', function (req, res) {
  function listAllUsers(nextPageToken) {
    // List batch of users, 1000 at a time.
    admin.auth().listUsers(1000, nextPageToken)
      .then(function (listUsersResult) {
        listUsersResult.users.forEach(function (userRecord) {
          console.log("user", userRecord.toJSON());
        });
        //res.json(listUsersResult);
        if (listUsersResult.pageToken) {
          // List next batch of users.
          listAllUsers(listUsersResult.pageToken);
        }
      })
      .catch(function (error) {
        console.log("Error listing users:", error);
        res.json(error);
      });
  }
  // Start listing users from the beginning, 1000 at a time.
  listAllUsers();
  res.json("success");
});

app.post('/signup', function (req, res) {
  var form = req.body;
  firebase.auth().createUserWithEmailAndPassword(form.email, form.password).then(
    user => {
      var profile = {
        username: form.username,
        email: form.email,
        phone: form.phone
      };
      var newShop = {
        nameShop: form.nameShop,
        type: form.type,
        qType: form.qType,
        serviceType: form.serviceType,
        avgServiceTime: form.avgServiceTime,
        numServer: form.numServer
      };
      var timeShop = {
        open: form.open,
        close: form.close,
        reserve: form.reserve
      };

      var uid = md5(form.email);
     
      db.ref('uidStorage/' + uid).set(form.username);
      db.ref('user/' + uid + '/profile').set(profile);
      db.ref('user/' + uid + '/shopData').set(newShop);
      db.ref('user/' + uid + '/shopData/time').set(timeShop);
      console.log('Your account has been created!');
      console.log(uid);

      const payload = {
        email: user.email,
      };
      var token = jwt.sign(payload, config.secret, {
        expiresIn: 86400 // expires in 24 hours
      });

      res.json({
        success: true,
        message: 'Your account has been created!',
        token: token,
        name: form.username,
        uid: uid
      });
    },
    error => {
      var errorCode = error.code;
      var errorMsg = error.message;
      if (errorCode == 'auth/weak-password') {
        res.json({
          success: false,
          message: 'The password is too weak',
        });
      } else {
        res.json({
          success: false,
          message: errorMsg,
        });
      }
    }
  );
});

app.post('/login', function (req, res) {
  var form = req.body;
  firebase.auth().signInWithEmailAndPassword(form.email, form.password).then(function (userRecord) {
    const payload = {
      email: userRecord.email,
    };
    var token = jwt.sign(payload, config.secret, {
      expiresIn: 86400 // expires in 24 hours
    })
    res.json({
      success: true,
      message: 'Your account has been loged in!',
      email: userRecord.email,
      token: token,
      uid: userRecord.uid
    });
  })
    .catch(error => {
      if (error.code === 'auth/wrong-password') {
        res.json({
          success: false,
          message: 'Wrong password!'
        });
      } else if (error.code === 'auth/user-not-found') {
        res.json({
          success: false,
          message: 'User not found!'
        });
      } else {
        res.json({
          success: false,
          message: error.message
        });
      }
    });
});

app.use(function (req, res, next) {
  var token = req.body.token || req.query.token || req.headers['x-access-token']
  if (token) {
    jwt.verify(token, config.secret, function (err, decoded) {
      if (err) {
        return res.json({
          success: false,
          message: 'Invalid token.'
        });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  } else {
    res.status(403).send({
      success: false,
      message: 'No token provided.'
    });
  }
});

app.listen(port, hostname, () => {
  console.log('UrQ API started at http://localhost:' + port);
});