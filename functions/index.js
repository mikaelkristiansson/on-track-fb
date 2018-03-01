'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
//const Language = require('@google-cloud/language');
const moment = require('moment');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
//const language = new Language({projectId: process.env.GCLOUD_PROJECT});

admin.initializeApp(functions.config().firebase);
// app.use(cors());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: false}));

// Express middleware that validates Firebase ID Tokens passed in the Authorization HTTP header.
// The Firebase ID token needs to be passed as a Bearer token in the Authorization HTTP header like this:
// `Authorization: Bearer <Firebase ID Token>`.
// when decoded successfully, the ID Token content will be added as `req.user`.
const authenticate = (req, res, next) => {
  if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
    res.status(403).send('Unauthorized');
    return;
  }
  const idToken = req.headers.authorization.split('Bearer ')[1];
  admin.auth().verifyIdToken(idToken).then(decodedIdToken => {
    req.user = decodedIdToken;
    next();
  }).catch(error => {
    res.status(403).send('Unauthorized');
  });
};

app.use(authenticate);

// POST /api/exercises
// Create a new exercise
app.post('/exercises', function(req, res) {
  const type = req.body.type;
  const createdAt = req.body.created_at ? req.body.created_at : moment().format('YYYY-MM-DD HH:mm:ss');
  const user = req.user;
  const data = {
    user: user.uid,
    type: type,
    createdAt: createdAt,//admin.database.ServerValue.TIMESTAMP,
    updatedAt: null,
    deletedAt: null
  };
  const newExercise = admin.database().ref(`/users/${user.uid}/exercises`).push(data);

  newExercise.once('value').then(snapshot => {
    return res.status(201).json(snapshot);
  });
});

// GET /api/exercises?date={date}
// Get all exercises, optionally specifying a year to filter on
app.get('/exercises', function(req, res) {
  const date = req.query.date + '-01-01';
  let query = admin.database().ref(`/users/${req.user.uid}/exercises`);
  if(req.query.date) {
    const startOfYear = moment(date).startOf('year').format('YYYY-MM-DD');
    const endOfYear = moment(date).endOf('year').format('YYYY-MM-DD');
    query = query.orderByChild('createdAt').startAt(startOfYear).endAt(endOfYear);
  }
  query.once('value').then(snapshot => {
    var exercises = [];
    snapshot.forEach(childSnapshot => {
      exercises.push({key: childSnapshot.key, type: childSnapshot.val().type, created_at: childSnapshot.val().createdAt});
    });

    return res.status(200).json(exercises);
  }).catch(error => {
    console.log('Error getting messages', error.message);
    res.sendStatus(500);
  });
});

/**
{
“last_month”: 20,
“last_six_months”: 40,
“this_year”: 95
}
*/
app.get('/exercises/total', function(req,res) {
  let lastMonth =  moment().subtract(1, 'months');
  let startM = moment(lastMonth.startOf('month')).format('YYYY-MM-DD');
  let endM = moment(lastMonth.endOf('month')).format('YYYY-MM-DD');
  let sixMonthsAgo = moment().subtract(6, 'months');

  let query = admin.database().ref(`/users/${req.user.uid}/exercises`);

  const startOfYear = moment().startOf('year').format('YYYY-MM-DD');
  const startOfLastYear = moment().subtract(1, ‘year’).startOf('year').format('YYYY-MM-DD');
  const endOfYear = moment().endOf('year').format('YYYY-MM-DD');

  query = query.orderByChild('createdAt').startAt(startOfLastYear).endAt(endOfYear);

  query.once('value').then(snapshot => { 
    let countLM = 0,
        countSM = 0,
        countTY = 0;
    snapshot.forEach(childSnapshot => { 
      let CA = childSnapshot.createdAt;
      // LAST MONTH
      if(CA.isBetween(startM, endM, 'days', true)) {
        countLM++;
      }
      // LAST 6 MONTHS
      if(CA.isAfter(moment(sixMonthsAgo.startOf('month')).format('YYYY-MM-DD'))) {
        countSM++;
      }
      // THIS YEAR
      if(CA.isBetween(startOfYear, endOfYear, 'days', true)) {
        countTY++;
      }
    });
    let result = {
      'last_month': countLM,
      'last_six_months': countSM,
      'this_year': countTY
    };
    return res.status(200).json(result); 
  }).catch(error => { 
    console.log('Error getting messages', error.message); 
    res.sendStatus(500); 
  });
});
// Middleware to catch 404 errors
// app.use(function(req, res) {
//   res.status(404).send({message: 'api route not found'});
// });

// GET /api/message/{messageId}
// Get details about a message
// app.get('/message/:messageId', (req, res) => {
//   const messageId = req.params.messageId;
//   admin.database().ref(`/users/${req.user.uid}/messages/${messageId}`).once('value').then(snapshot => {
//     if (snapshot.val() !== null) {
//       // Cache details in the browser for 5 minutes
//       res.set('Cache-Control', 'private, max-age=300');
//       res.status(200).json(snapshot.val());
//     } else {
//       res.status(404).json({errorCode: 404, errorMessage: `message '${messageId}' not found`});
//     }
//   }).catch(error => {
//     console.log('Error getting message details', messageId, error.message);
//     res.sendStatus(500);
//   });
// });

// Expose the API as a function
exports.api = functions.https.onRequest(app);
