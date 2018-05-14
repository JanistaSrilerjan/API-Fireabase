var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var cors = require('cors');
var fetch = require('node-fetch');
var datetime = require('node-datetime');
var mergeJSON = require("merge-json");

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
var serviceAccount = require('./urqproject-38bef-firebase-adminsdk-u2nkv-6a67f0ff04.json');

var jwt = require('jsonwebtoken');
var md5 = require('md5');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://urqproject-38bef.firebaseio.com/'
});

app.get('/', function (req, res) {
  res.send('Hello! The API is at http://localhost:' + port + '/api');
});

//get all data
app.get('/user', function (req, res) {

  data.once("value", function (snapshot) {
    res.json(snapshot);
  });
});

//get user data
app.get('/user/profile', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var user = db.ref('user/' + uid);
  console.log(uid);

  user.once("value", function (snapshot) {
    res.json(snapshot);
  });
});

//signup
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
      };
      var reserveOnline = {
        reserveStatus: "0",
        reserveOpen: form.open,
        reserveClose: form.close
      };
      var call = {
        callNow: "0",
        callDefine: "0"
      };
      var uid = firebase.auth().currentUser.uid;
      // var uid = md5(form.email);

      db.ref('uidStorage/' + uid).set(form.username);
      db.ref('user/' + uid + '/profile').set(profile);
      db.ref('user/' + uid + '/shopData').set(newShop);
      db.ref('user/' + uid + '/shopData/time').set(timeShop);
      db.ref('user/' + uid + '/shopData/reserve').set(reserveOnline);
      db.ref('user/' + uid + '/callQ').set(call);
      console.log('Your account has been created!');
      console.log(uid);

      res.json({
        success: true,
        message: 'Your account has been created!',
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
          type_error: 0,
          message: 'The password is too weak',
        });
      } else if (errorCode == 'auth/email-already-in-use') {
        res.json({
          success: false,
          type_error: 1,
          message: 'This email is already in use by another accout.',
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

//update profile
app.put('/profile', function (req, res) {

  var uid = firebase.auth().currentUser.uid;
  var form = req.body;

  var profile = {
    phone: form.phone
  };
  var newShop = {
    qType: form.qType,
    serviceType: form.serviceType,
    avgServiceTime: form.avgServiceTime,
    numServer: form.numServer
  };
  var timeShop = {
    open: form.open,
    close: form.close
  };

  db.ref('user/' + uid + '/profile').update(profile);
  db.ref('user/' + uid + '/shopData').update(newShop);
  db.ref('user/' + uid + '/shopData/time').update(timeShop);

  return res.json({
    success: true,
    message: 'Your profile has been updated!',
    uid: uid
  });
});

//count all queue
app.get('/count/q', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var count;
  var qNum = db.ref('user/' + uid + '/qNumber');
  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    res.json({
      count: count
    });
  });
});

app.get('/count/define', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var count;
  var qNum = db.ref('user/' + uid + '/callQ/callDefine/');
  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    res.json({
      count: count
    });
  });
});

//delete list of doing queue that user defined
app.delete('/call/def/:id', function (req, res) {
  var id = req.params.id;
  var uid = firebase.auth().currentUser.uid;
  var callQ = db.ref('user/' + uid + '/callQ/callDefine/' + id);

  callQ.remove();
  return res.json({
    success: true,
    message: 'Delete Complete!',
    uid: uid
  });
});

app.get('/user/addq', function (req, res) {
  //var uid = req.params.uid;
  var uid = firebase.auth().currentUser.uid;
  var count;
  var qNum = db.ref('user/' + uid + '/qNumber');

  console.log(uid);

  qNum.once("value", function (snapshot) {
    res.json(snapshot);
  });
});

//add detail queue into qNumber
app.post('/user/addq', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var rand = Math.floor(1000 + Math.random() * 9000); //random pin 4 digits
  var pin = rand.toString();
  var count;

  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    console.log("There are " + count + " queues");
    count++;
    var q = {
      id: count,
      nameCustomer: form.nameCustomer,
      noCustomer: form.noCustomer,
      pin: pin,
      status: "q",
      addType: "0",
      repeat: "0"
    };
    db.ref('user/' + uid + '/qNumber/' + count).set(q);
    return res.json({
      success: true,
      nameCustomer: q.nameCustomer,
      noCustomer: q.noCustomer,
      uid: uid,
      pin: q.pin,
      count: count,
      status: q.status,
      addType: "walk_in"
    });
  });
});

//set a queue is calling now
app.put('/call/now/:numq', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var numq = req.params.numq;
  db.ref('user/' + uid + '/callQ/callNow').set(numq);
  return res.json({
    success: true,
    message: "Next q Now!",
    numq: numq
  });
});

//data of a queue 
app.get('/dataq/:id', function (req, res) {
  var id = req.params.id;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber/' + id);
  qNum.once("value", function (snapshot) {
    res.json(snapshot);
  });
});

//get data of doing queue that defined by user
app.get('/data/doing/', function (req, res) {
  var id = req.params.id;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/callQ/callDefine');
  qNum.once("value", function (snapshot) {
    res.json(snapshot);
  });
});

//get number of doing queue that defined number by user 
app.get('/cdata/doing', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = db.ref("user/" + uid + '/callQ/callDefine');
  var count;

  Ref.once("value", function (snapshot) {
    count = snapshot.numChildren();
    res.json({
      count: count
    });
  });
});

app.get('/call/now', function (req, res) { //get main queue number that doing now
  var uid = firebase.auth().currentUser.uid;
  var state = db.ref('user/' + uid + '/callQ/callNow');
  state.once("value", function (snapshot) {
    res.json(snapshot);
  });
});


app.post('/call/next/recent', function (req, res) { //call next q recently
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var Ref = db.ref("user/" + uid + "/qNumber");
  var Fin = db.ref('user/' + uid + '/callQ/willFinish');
  var c = 0;
  var count;

  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    console.log("There are " + count + " queues");
    count++;
    Ref.orderByChild("status").equalTo("doing").once("value", function (snapshot) {
      snapshot.forEach(function (childSnapshot) {
        c++;
      });
      c++;
      var q = {
        id: count,
        nameCustomer: "None",
        status: "doing",
        addType: "2",
        repeat: "0",
        time: {
          timeIn: form.timeIn,
          timeOut: form.timeOut
        },
        doing: c
      }; 

      Fin.orderByChild("id").equalTo(count).once("child_added", function (snapshot) {
        res.json(snapshot.val());
      }, function (error) {
        return res.json("Error: " + error.code);
      });
      
      db.ref('user/' + uid + '/qNumber/' + count).set(q);   
      return res.json({
        success: true,
        message: "call q out system",
        nameCustomer: q.nameCustomer,
        noCustomer: q.noCustomer,
        uid: uid,
        count: count,
        status: q.status,
        addType: "call_next_recently",
        doing:c
      });
    }, function (error) {
      return res.json("Error: " + error.code);
    });
    
  });
});

//get last queue that expected finish
app.get('/will/fin/doing',function(req,res){

  var uid = firebase.auth().currentUser.uid;
  var Fin = db.ref('user/' + uid + '/callQ/willFinish');

  Fin.limitToLast(1).once("child_added", function (snapshot) {
    res.json(snapshot.val());
  });
});

//post data of doing queue that user added by click next queue button
app.post('/call/next/recent/:doing', function (req, res) { //call next q recently
  var form = req.body;
  var doing = req.params.doing;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var Ref = db.ref("user/" + uid + "/qNumber");
  var Fin = db.ref('user/' + uid + '/callQ/willFinish');
  var c = 0;
  var count;

  qNum.once("value", function (snapshot) {
    count = snapshot.numChildren();
    console.log("There are " + count + " queues");
    count++;
      var q = {
        id: count,
        nameCustomer: "None",
        status: "doing",
        addType: "2",
        repeat: "0",
        time: {
          timeIn: form.timeIn,
          timeOut: form.timeOut
        },
        doing: doing
      }; 

      Fin.orderByChild("id").equalTo(count).once("child_added", function (snapshot) {
        res.json(snapshot.val());
      }, function (error) {
        return res.json("Error: " + error.code);
      });
      
      db.ref('user/' + uid + '/qNumber/' + count).set(q);   
      return res.json({
        success: true,
        message: "call q out system",
        nameCustomer: q.nameCustomer,
        noCustomer: q.noCustomer,
        uid: uid,
        count: count,
        status: q.status,
        addType: "call_next_recently",
        doing:doing
      });
   
    
  });
});

//get sequence of doing queue
app.get('/have/doing/:id',function(req,res){

  var id =req.params.id;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber/' + id +'/doing');
  
  qNum.once("value", function (snapshot) {
    res.json(snapshot);
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

//change status of queue is doing
app.put('/call/next/:count', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  
  var count = req.params.count;
  var c = 0;

  var q = {
    status: "doing"
  };

  Ref.orderByChild("status").equalTo("doing").once("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      c++;
    });
    c++;
    db.ref('user/' + uid + '/qNumber/' + count).update({
      doing: c
    });
    db.ref('user/' + uid + '/qNumber/' + count).update(q);
    return res.json({
      success: true,
      message: "call q in system",
      count: count,
      status: q.status,
      doing: c
    });
    console.log(count);
  }, function (error) {
    res.json("Error: " + error.code);
  });

});

//change status of queue is doing and add sequence of doing queue
app.put('/call/next/:count/:doing', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  
  var count = req.params.count;
  var doing =req.params.doing;
  var c = 0;

  var q = {
    status: "doing"
  };

 
    db.ref('user/' + uid + '/qNumber/' + count).update({
      doing: doing
    });
    db.ref('user/' + uid + '/qNumber/' + count).update(q);
    return res.json({
      success: true,
      message: "call q in system3",
      count: count,
      status: q.status,
      doing: doing
    });
});

//change queue status is 'doing' [define q]
app.put('/call/def/:count', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  
  var count = req.params.count;

  var q = {
    status: "doing"
  };
  Ref.orderByChild("status").equalTo("doing").once("value", function (snapshot) {
    db.ref('user/' + uid + '/qNumber/' + count).update(q);
    res.json({
      success: true,
      message: "call q in system2",
      count: count,
      status: q.status
    });
    console.log(count);
  }, function (error) {
    res.json("Error: " + error.code);
  });

});

//get data of first queue number that queueing now 
app.get('/next', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  Ref.orderByChild("status").equalTo("q").limitToFirst(1).once("child_added", function (snapshot) {
    res.json(snapshot.val());
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

app.get('/walkin', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  var json, jsons = [];

  Ref.orderByChild("addType").equalTo("0").on("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      json = childSnapshot.val();
      if (json) {
        jsons.push(json);
      }
    });
    res.json(jsons);
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

app.get('/count/walkin', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  var count = 0;

  Ref.orderByChild("addType").equalTo("0").on("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      count++;
    });
    res.json({
      success: true,
      count: count
    });
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

app.get('/online', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  var json, jsons = [];

  Ref.orderByChild("addType").equalTo("1").on("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      json = childSnapshot.val();
      if (json) {
        jsons.push(json);
      }
    });
    res.json(jsons);
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

app.get('/count/online', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  var count = 0;

  Ref.orderByChild("addType").equalTo("1").on("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      count++;
    });
    res.json({
      success: true,
      count: count
    });
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

//change status to repeat of a queue that user called 
app.put('/callq/:id', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var id = req.params.id;

  db.ref('user/' + uid + '/qNumber/' + id).update({
    repeat: "1"
  });

  return res.json({
    success: true,
    message: 'Call Repeat!',
    uid: uid,
    id: id
  });
});

//add detail of queue : queue number and name customer [path callDefine in database]
app.post('/callq/:id/:name', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var id = req.params.id;
  var name = req.params.name;

  var call = {
    id: id,
    name: name
  };

  db.ref('user/' + uid + '/callQ/callDefine/' + id).set(call);
  return res.json({
    success: true,
    message: 'Call Repeat!',
    uid: uid,
    id: id
  });

});

//remove all queue
app.delete('/user/reset', function (req, res) {

  var uid = firebase.auth().currentUser.uid;
  var qNum = db.ref('user/' + uid + '/qNumber');
  var callQ = db.ref('user/' + uid + '/callQ/callDefine');
  var willFin = db.ref('user/' + uid + '/callQ/willFinish');
  callQ.remove();
  qNum.remove();
  willFin.remove();

 return res.json({
    success: true,
    message: 'Reset Complete!',
    uid: uid
  });
});

//set queue that calling now to 0
app.put('/user/reset', function (req, res) {

  var uid = firebase.auth().currentUser.uid;
  db.ref('user/' + uid + '/callQ/callNow').set("0");
  return res.json({
    success: true,
    message: 'Reset Complete!',
    uid: uid
  });
});

//add time in and time out [click next queue button]
app.put('/nextq/:id', function (req, res) {

  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var id = req.params.id; //////////id is next id./////////

  var time = {
    timeIn: form.timeIn,
    timeOut: form.timeOut
  };
  db.ref('user/' + uid + '/qNumber/' + id + '/time').update(time);

  return res.json({
    success: true,
    message: 'Call Queue!',
    uid: uid,
    id: id
  });
});

//change status of queue to finish
app.put('/finishq/:id', function (req, res) {
  //var uid = req.params.uid;
  var uid = firebase.auth().currentUser.uid;
  var id = req.params.id; //////////id from calculate id finish compare #server/////////

  db.ref('user/' + uid + '/qNumber/' + id).update({
    status: "finish"
  });

  return res.json({
    success: true,
    message: 'Finish Queue!',
    uid: uid,
    id: id
  });
});

//get data of queue that expected finish first
app.get('/will/fin', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/callQ/willFinish");
  Ref.once("child_added", function (snapshot) {
   res.json(snapshot.val());
  });
});

//delete data of queue that expected finish first
app.delete('/will/fin/:id', function (req, res) {
  var id = req.params.id;
  var uid = firebase.auth().currentUser.uid;
  var Ref = db.ref("user/" + uid + "/callQ/willFinish");
  var Fin = db.ref("user/" + uid + "/callQ/willFinish/"+id);

  Fin.remove();
  return res.json({
    success: true,
    message: 'Delete Complete!',
    id: id
  });
});

app.get('/will/fin/:count',function(req,res){

  var uid = firebase.auth().currentUser.uid;
  var Fin = db.ref('user/' + uid + '/callQ/willFinish');
  var c = req.params.c;
  var count = req.params.count;
  var cc =0;

  Fin.orderByChild("id").equalTo(count).once("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      cc++;
    });
    return res.json({
      success: true,
      count: cc
    });
  }, function (error) {
    res.json("Error: " + error.code);
  });
   
});

//keep queue number and sequence of doing queue 
app.post('/will/fin/:id/:doing',function(req,res){
  var uid = firebase.auth().currentUser.uid;
  var id =req.params.id;
  var doing = req.params.doing;
  var fin ={
    id:id,
    no:doing
  };
  db.ref('user/' + uid + '/callQ/willFinish/' + doing).set(fin);
  return res.json({
    success: true,
    id: id,
    doing:doing
  });
});

app.get('/doing', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  Ref.orderByChild("status").equalTo("doing").limitToFirst(1).once("child_added", function (snapshot) {
    res.json(snapshot.val());
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

//number of queues that are doing in server
app.get('/count/doing', function (req, res) {
  var uid = firebase.auth().currentUser.uid;
  var Ref = firebase.database().ref("user/" + uid + "/qNumber");
  var count = 0;

  Ref.orderByChild("status").equalTo("doing").once("value", function (snapshot) {
    snapshot.forEach(function (childSnapshot) {
      count++;
    });
    res.json({
      success: true,
      count: count
    });
    console.log(count);
  }, function (error) {
    res.json("Error: " + error.code);
  });
});

app.put('/reserve/online', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var reserveOnline = {
    reserveStatus: form.reserveStatus,
    reserveOpen: form.reserveOpen,
    reserveClose: form.reserveClose
  };
  db.ref('user/' + uid + '/shopData/reserve').update(reserveOnline);

  return res.json({
    success: true,
    message: 'Reserve Online!',
    uid: uid
  });
});

app.put('/reserve/close', function (req, res) {
  var form = req.body;
  var uid = firebase.auth().currentUser.uid;
  var reserve = {
    reserveStatus: form.reserveStatus
  };
  db.ref('user/' + uid + '/shopData/reserve').update(reserve);
  return res.json({
    success: true,
    message: 'Reserve Online is Close!',
    uid: uid
  });
});

//login
app.post('/login', function (req, res) {
  var form = req.body;
  firebase.auth().signInWithEmailAndPassword(form.email, form.password).then(function (userRecord) {
      console.log('User authentication successful');
      console.log(userRecord.email);
      var uuid = firebase.auth().currentUser.uid;
      
      return res.json({
        success: true,
        message: 'Your account has been loged in!',
        email: userRecord.email,
        uid: userRecord.uid,
        uuid: uuid
      });
    })
    .catch(error => {
      if (error.code === 'auth/wrong-password') {
        res.json({
          success: false,
          type_error: 0,
          message: 'Wrong password!'
        });
      } else if (error.code === 'auth/user-not-found') {
        res.json({
          success: false,
          type_error: 1,
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

app.get('/signout', function (req, res) {
  var uuid = firebase.auth().currentUser.uid;
  firebase.auth().signOut().then(function () {
    res.json({
      success: true,
      message: 'Signed Out',
      uid: uuid
    });
  }, function (error) {
    console.error('Sign Out Error', error);
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

app.listen(port, () => {
  console.log('UrQ API started at http://localhost:' + port);
});