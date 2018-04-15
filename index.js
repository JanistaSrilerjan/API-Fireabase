var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var cors = require('cors');
var fetch = require('node-fetch');

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

app.get('/user/:uid', function (req, res) {

  var uid = req.params.uid;
  var user = db.ref('user/' + uid);
  console.log(uid);

  user.once("value", function (snapshot) {
    res.json(snapshot);
  });
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
      var uid = firebase.auth().currentUser.uid;
      // var uid = md5(form.email);

      db.ref('uidStorage/' + uid).set(form.username);
      db.ref('user/' + uid + '/profile').set(profile);
      db.ref('user/' + uid + '/shopData').set(newShop);
      db.ref('user/' + uid + '/shopData/time').set(timeShop);
      console.log('Your account has been created!');
      console.log(uid);


      /*  const payload = {
          email: user.email,
        };
        var token = jwt.sign(payload, config.secret, {
          expiresIn: 86400 // expires in 24 hours
        });*/

      res.json({
        success: true,
        message: 'Your account has been created!',
        //token: token,
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
app.get('/user/addq/:uid', function (req, res) {
  var uid = req.params.uid;
  var count;
  var qNum = db.ref('user/' + uid + '/qNumber');

  console.log(uid);

  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    var qCount = db.ref('user/' + uid + '/qNumber/' + count);
    qCount.once("value", function (snapshot) {
      res.json(snapshot);
    });
  });
});
app.post('/user/addq/:uid', function (req, res) {
  var form = req.body;
  var uid = req.params.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var rand = Math.floor(1000 + Math.random() * 9000);
  var pin = rand.toString();
  var count;

  /*var time = {
    timeIn: form.timeIn,
    timeOut: form.timeOut
  };*/
  //
  //db.ref('qNumber/'+ form.count + '/time').set(time);
  //db.ref('uidStorage/' + uid ).set(q);

  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    console.log("There are " + count + " queues");
    count++;
    var q = {
      id: count,
      nameCustomer: form.nameCustomer,
      noCustomer: form.noCustomer,
      pin: pin
      //repeat: form.repeat,
      //status: form.status
    };
    db.ref('user/' + uid + '/qNumber/' + count).set(q);
    res.json({
      success: true,
      nameCustomer: q.nameCustomer,
      noCustomer: q.noCustomer,
      uid: uid,
      pin: q.pin,
      count: count
    });
  });
});
app.put('/user/callq/:uid/:id', function (req, res) {
  var form = req.body;
  var uid = req.params.uid;
  var id = req.params.id;
  var qNum = db.ref('user/' + uid + '/qNumber');
  
  db.ref('user/' + uid + '/qNumber/' + id).update({
    repeat: "1"
  });
  res.json({
    success: true,
    message:'Call Repeat!',
    uid: uid,
    id: id
  });

});
app.delete('/user/reset/:uid', function (req, res) {
  var uid = req.params.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  qNum.remove();
  res.json({
    success: true,
    message: 'Reset Complete!',
    uid: uid
  });
});
app.post('/login', function (req, res) {
  var form = req.body;
  firebase.auth().signInWithEmailAndPassword(form.email, form.password).then(function (userRecord) {
      console.log('User authentication successful');
      console.log(userRecord.email);
      var uuid = firebase.auth().currentUser.uid;
      /* const payload = {
         email: userRecord.email,
       };
       var token = jwt.sign(payload, config.secret, {
         expiresIn: 86400 // expires in 24 hours
       });*/
      res.json({
        success: true,
        message: 'Your account has been loged in!',
        email: userRecord.email,
        //token: token,
        uid: userRecord.uid,
        uuid: uuid
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


/*
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
});*/



app.listen(port, hostname, () => {
  console.log('UrQ API started at http://localhost:' + port);
});