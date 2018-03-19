var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();

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
var serviceAccount = require('./test-pj-92383-firebase-adminsdk-dmmav-668d0462ec.json');

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
  admin.auth().createUser({
    email: req.body.email,
    password: req.body.password
    //phoneNumber: "+11234567890"
  })
    .then(function (userRecord) {
      console.log("Successfully created new user:", userRecord.uid);
      return res.json({
        success: true,
        message: 'New user has been created',
        user: {
          uid: userRecord.uid,
          email: userRecord.email
        }
      });
    })
    .catch(function (error) {

      var errorMessage = error.message; 
      console.log("Error creating new user:", error);
      res.json({
        success: false,
        message: errorMessage
      });
    });
});
app.post('/login', function (req, res) {
  firebase.auth().signInWithEmailAndPassword(req.body.email, req.body.password)
    .then(function (userRecord) {
      console.log("Log in by", userRecord.uid);
      firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
          user.getIdToken().then(function(data) {
            return res.json({
              success: true,
              message: 'Log in success!',
              token: data,
              user: {
                uid: userRecord.uid,
                email: userRecord.email
              }
            });
           // console.log(data);
          });
        }
      });
      /*return res.json({
        success: true,
        message: 'Log in success!',
        user: {
          uid: userRecord.uid,
          email: userRecord.email
        }
      });*/
    })
    .catch(function (error) {
      var errorCode = error.code;
      var errorMessage = error.message;

      if ( errorCode === 'auth/user-not-found' ) {
        res.json({
          success: false,
          message: 'Authentication failed. User not found.'
        });
      }
      else if (errorCode === 'auth/wrong-password') {
        res.json({
          success: false,
          message: 'Wrong password.'
        });
      } else {
        res.json({
          success: false,
          message: errorMessage
        });
      }
      console.log(error);

      //throw error;
    });

});
app.listen(port, hostname, () => {
  console.log('UrQ API started at http://localhost:' + port);
});