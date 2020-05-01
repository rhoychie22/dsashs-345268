const express = require('express');
const adminRoute = require('./routes/admin-route');
const studentRoute = require('./routes/student-route');
const dsashsRoute = require('./routes/dsashs-route');
const myControl = require('./controller/myController.js');
const studentControl = require('./controller/student-controller.js');
const keys = require('./config/keys');
const session = require('express-session');
const bodyParser = require('body-parser');
const request = require('request');
const passport = require('passport');
const pdfRoute = require('./routes/pdfmake-route');
const enrollmentSettings = require('./models/admin-enrollment-settings-model.js');
const filterStudent = require('./models/admin-filter.js');
const userAdmin = require('./models/admin-user-model');
const reportFilter = require('./models/admin-report-filter');
const tempStudent = require('./models/student-temp-model.js');
const tempNewStudent = require('./models/student-temp-new-model.js');
const pendingNewStudent = require('./models/new-student-pending-model.js');
const strandAdmin = require('./models/admin-enrollment-strands-model.js');
const sectionAdmin = require('./models/admin-enrollment-section-model.js');
const enrollStudent = require('./models/student-enroll-model.js');
const mongoose = require('mongoose');
var crypto = require('crypto');
const Nexmo = require('nexmo');

var port = process.env.PORT || 3000;
mongoose.Promise = global.Promise;
// mongoose.set('debug', true);
mongoose
  .connect(process.env.MONGO_URI || keys.mongodb.url, { useNewUrlParser: true })
  .then(() => console.log('MongDB connected sucessfully'))
  .catch((err) => console.log(err));

var dateTime = require('node-datetime');
var cron = require('node-cron');

cron.schedule('0 0 * * * Sunday', () => {

  console.log("deleted every 12 hours of sunday");
  tempStudent.deleteMany({}, (err)=>{
    console.log('Database 1 Cleared');
  });
  tempNewStudent.deleteMany({}, (err)=>{
    console.log('Database 2 Cleared');
  });
  pendingNewStudent.deleteMany({}, (err)=>{
    console.log('Database 3 Cleared');
  });
});


strandAdmin.find({}, (err, user)=>{
  if(user.length === 0){
    new strandAdmin({
      tracks: 'academics',
      strands: 'general academic strands'
    }).save((err)=>{
      console.log("tracks and strands saved");
    });
  }
});


sectionAdmin.find({}, (err, user)=>{
  if(user.length === 0){
    new sectionAdmin({
      strand: 'general academic strands',
      section: 'a'
    }).save((err)=>{
      console.log("strands and section saved");
    });
  }
});










const app = express();
myControl(app);
studentControl(app);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/pdfMake', pdfRoute);
app.use(
  session({
    secret: keys.sessionKey.secretKey,
    resave: true,
    saveUninitialized: true
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/assets', express.static('assets'));
app.use('/administrator', adminRoute);
app.use('/student', studentRoute);
app.use('/dsashs', dsashsRoute);
app.set('view engine', 'ejs');

var holder = '';

userAdmin.deleteMany({userType: 'Administrator'}, (err)=>{
  console.log('deleted');
});

app.get('/', (req, res) => {


  req.session.destroy();

  enrollmentSettings.find({}, (err, user) => {
    userAdmin.find({userType: 'Administrator'}, (err, user2) => {

      var algorithm = 'aes256';
      var key = keys.cipherKey.key;
      var text = keys.newUser.locations;

      var cipher = crypto.createCipher(algorithm, key);
      var encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');

      if (user2.length === 0) {

        new userAdmin({
          idNumber: keys.newUser.idNumber,
          lastname: keys.newUser.lastname,
          middlename: keys.newUser.middlename,
          firstname: keys.newUser.firstname,
          userType: keys.newUser.userType,
          phoneNumber: keys.newUser.phoneNumber,
          gender: keys.newUser.gender,
          password: encrypted,
          teachingStatus: keys.newUser.teachingStatus
        }).save((err)=>{
          console.log('data saved');
        });
      }
    });

    filterStudent.find({}, (err, user3)=>{
      if (user3.length === 0){
        new filterStudent({
          key: keys.studentFilter.myKey,
          viewStudents: 'all'
        }).save((err)=>{
          console.log('save filter');
        });
      }
    });



    if (user.length === 0) {
      new enrollmentSettings({
        _id: '5d5eac152b3cd10e8c764ef0',
        enrollmentStatus: 'enable',
        maxEntries: '2',
        maxStudent: '2',
        academicFirst: '2019',
        academicEnds: '2020',
        semester: '2nd Semester'
      }).save();
    } else {
      holder = 'home';

      enrollmentSettings.findOne({_id: '5d5eac152b3cd10e8c764ef0'}, (err, user4)=>{

        pendingNewStudent.distinct('lrn' ,(err, user5)=>{
          if(user5.length>=user4.maxEntries){
            res.render('app', { settings: user, hold: holder , entries: true});
          }else{
            res.render('app', { settings: user, hold: holder , entries: false});
          }
        });
      });



    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('*', function(req, res){
  res.render('404/404');
});

app.listen(port, () => {
  console.log('Server is now listening to port 3000');
});
