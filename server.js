/*  EXPRESS */
const express = require('express');
require('dotenv').config();
const cors = require('cors')
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
const auth = require('./middleware/auth');
app.use(express.json({limit: '35mb'}))
const PORT = process.env.PORT;
const SALT = process.env.SALT;
const BEURL = process.env.BEURL  || "http://localhost:8088"
const aes256 = require('aes256');
const CryptoJS = require('rn-crypto-js')
const {  SendMail } = require('./services/mail-service');
router = new express.Router();
let resetlist = {};
const { v4: uuidv4 } = require('uuid');
const schedule = require('node-schedule');
const axios = require('axios');
const fs = require('fs');
const {Leopard} = require("@picovoice/leopard-node");
const entity = require("./entities/entities");

function _Task(email,title, description, start_time, end_time, frequency=undefined) {
  return {
    created_by:email,
    _id:uuidv4(),
    title: title,
    description: description,
    status: "notdone",
    // is_repeated: is_repeated,
    frequency: frequency,
    start_time: start_time,
    end_time: end_time

  }
}

async function NotificationApi (expo_token, title, sub, body)  {


  var data = JSON.stringify({
    to: expo_token,
    title: title,
    subtitle: sub,
    body: body
});
    [

  ]
    var config = {  
      method: 'post',
      url: "https://api.expo.dev/v2/push/send",
      headers: {
        "accept": "application/json",
        "accept-language": "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7,fr-FR;q=0.6,fr;q=0.5",
        "content-type": "application/json",
        "sec-ch-ua": "\"Chromium\";v=\"118\", \"Google Chrome\";v=\"118\", \"Not=A?Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Referer": "https://expo.dev/",
        "Referrer-Policy": "origin"
      },
      data:data
    };
    
    try {
      const res = await axios(config)
      console.log(res.data)
      return res;
    } catch (e) {
        console.log(e)
        return e
    }

}

const rule = new schedule.RecurrenceRule();
rule.second = process.env.INTERVAL_SECOND;

if(process.env.TIMER==='true') {
  console.log("run timer");
  const job = schedule.scheduleJob(rule, async function(){
    let users = await User.getAllUsers();
    for (const i of users) {
      let change = false;
      if(i.devices) {
        for (const k in i.devices) {
          if (Object.hasOwnProperty.call(i.devices, k)) {
            if (k) {
              if (i.devices[k].appNotification && i.tasks.task) {
                console.log("send noti to apps");
                for (let j of i.tasks.task) {
                  if (!j.due || j.noti_sent) continue;
                  let due = new Date(j.due);
                  if(due.getTime() <= Date.now() + 400000) {
                    change = true;
                    j.noti_sent = true;
                    
                    NotificationApi(k, "TIMETABLE APPS", "Reminder for: " + j.title, j.title);
                    console.log(change);
                  }
                  
                }
              }
              if (i.devices[k].emailNotification && i.tasks.task) {
                console.log("send noti to email");
                for (let j of i.tasks.task) {
                  if (!j.due || j.noti_sent) continue;
                  let due = new Date(j.due);
                  if(due.getTime() <= Date.now() + 400000) {
                    change = true;
                    j.noti_send = true;
                    SendMail(i.email,"reminder for " + j.title, "this is reminder send from TIMETABLE APPS", "" )
                    console.log(change);
                  }
                  
                }
              }
            }
            
          }
        }
      }
      if(change) {
        // console.log(i.tasks.task);
        i.tasks.timestamp = Date.now();
        User.updateTask(i.email, i.tasks);
      }
    }
    console.log('Timer trigger!');
  });
}


router.get('/users/new',async (req, res) => {
  if (req && req.query && req.query.key) {
    console.log(req.originalUrl);
    let check = req.originalUrl.replace("/users/new?key=",'');
    console.log(check);
    check = aes256.decrypt(SALT, check);
    console.log(check);
    // if(!resetlist[check]) return res.status(400).send("bad request");
    let user = await User.getUser({email:check});
    
    if (user) {
      try {
        User.verifyAccount(check)
        res.send("account verified");
      } catch (e) {
        console.log(e);
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

router.post('/users/create',async (req, res) => {
  if (req && req.body && req.body.email && req.body.password) {
    try {
      let user =  await User.getUser({email:req.body.email});
      if(user){
        res.status(400).send("Bad request");
        return;
      }
      await User.createNewUserWithPassword(req.body.email, req.body.password);
      let secret = aes256.encrypt(SALT, req.body.email);
      await SendMail(req.body.email,"Timetable Create new account" , 'follow current link to verify your account: ',BEURL + "/users/new?key=" + secret );
      
      res.status(200).send("Ok");

    } catch (e) {
      console.log(e);
      res.status(400).send("Bad request");
    }
  } else {
  console.log(req);
  res.status(400).send("");
  }
});

router.post('/users/login',async (req,res) => {
  if (req && req.body && req.body.email && req.body.password) {

    let user = await User.loginWithPassword(req.body.email, req.body.password);
    if (user) {
      if (!user.verify) {
        // console.log(user);
        res.status(401).send("unauthorized");
        return;
      }

      let devices = user.devices;
      console.log(devices);
      if (devices && req.body.device && !devices[req.body.device]) {
        devices[req.body.device] = {appNotification: true, emailNotification:false};
        await User.updateDevice(req.body.email, devices);
      }
      if (!devices) {
        devices = {};
        devices[req.body.device]={appNotification: true, emailNotification:false};
        await User.updateDevice(req.body.email, devices);
      }
      let settings = {appNotification: true, emailNotification:false};
      if (req.body.device && devices[req.body.device]) {
        settings=  devices[req.body.device]
      }
      // let flag = true;
      // if (devices && req.body.device) {
      //   try {
      //     for (const i of devices) {
      //       if(i == req.body.device) {
      //         flag = false;
      //         break;
      //       }
      //     }
      //     if(flag) {
      //       devices.push(req.body.devices);
      //       await User.updateDevice(req.body.email, devices);
      //     }
          
      //   } catch (e) {
          
      //   }
        
      // }
      if (user.google_ref) {
        for (const k in user.google_ref) {
          if (Object.hasOwnProperty.call(user.google_ref, k)) {
            delete user.google_ref[k].ref_token;
            
          }
        }
      }
      token = jwt.sign({_id:user._id }, SALT);
      console.log(user._id);
      res.status(200).send({user:req.body.email, phone_number: user.phone_number || '',name: user.name || '', token:token, settings:settings, google_ref: user.google_ref || {}});
      
    } else {
      res.status(400).send("Bad request");
    }
  } else {
    res.status(400).send("Bad request");
  }
});

router.post('/users/settings', auth, async (req,res) => {
  if (req && req.body && req.body.settings && req.body.device) {
    let user = req.user;
    if(!user) {
      res.status(400).send("bad request");
      return;
    }
    if (user) {
      try {
        let devices = user.devices;
        devices[req.body.device]=req.body.settings
        let update = await User.updateDevice(user.email, devices);
        console.log(update);
        res.send("OK");
      } catch (e) {
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

router.get('/users/get', auth, async (req,res) => {

    let user = req.user;
    if(!user) {
      res.status(400).send("bad request");
      return;
    } else {
      if (user.google_ref) {
        for (const k in user.google_ref) {
          if (Object.hasOwnProperty.call(user.google_ref, k)) {
            delete user.google_ref[k].ref_token;
            
          }
        }
      }
      let settings = {appNotification: true, emailNotification:false};
      if (req.body.device && devices[req.body.device]) {
        settings=  devices[req.body.device]
      }
      let data = {user:user.email, phone_number: user.phone_number || '',name: user.name || '', settings:settings, google_ref: user.google_ref || {}};
      console.log(data);
      res.status(200).send(data);
    }

});

router.post('/users/update', auth, async (req,res) => {

    let user = req.user;
    if(!user) {
      res.status(400).send("bad request");
      return;
    } else {
      await User.updateUser(user.email,{name: req.body.name, phone_number:req.body.phone_number});
      res.status(200).send("OK");
    }

});

router.post('/users/changepassword', auth, async (req,res) => {
  if (req && req.body && req.body.currentPassword && req.body.newPassword) {
    let user = await User.loginWithPassword(req.user.email, req.body.currentPassword);
    if (user) {
      try {
        let update = await User.changePassword(req.user.email, req.body.newPassword);
        console.log(update);
        res.send("OK");
      } catch (e) {
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

router.post('/users/newpassword', async (req,res) => {
  console.log(resetlist);
  // console.log(req.body);
  if (req && req.body && req.body.email && req.body.newPassword && req.body.secret) {
    let user = await User.getUser({email:req.body.email});
    // let check = aes256.decrypt(SALT, req.body.secret);
    console.log(req.body.secret);
    let check = CryptoJS.AES.decrypt(req.body.secret, SALT).toString(CryptoJS.enc.Utf8);
    console.log(check);
    if(!resetlist[check]) return res.status(400).send("bad request");
    if (user && user.Local.email === check) {
      try {
        let update = await User.changePassword(req.body.email, req.body.newPassword);
        console.log(update);
        delete resetlist[check];
        res.status(200).send("OK");
      } catch (e) {
        console.log(e);
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

router.post('/users/resetpassword', async (req,res) => {
  if (req && req.body && req.body.email) {

    let user = await User.getUser({email:req.body.email});
    
    if (user) {
      try {
        let secret = aes256.encrypt(SALT, req.body.email);
        await SendMail(req.body.email,"Timetable reset password" , 'follow current link to reset your password: ', BEURL+ '/users/verifyreset?key=' + secret );
        res.status(200).send("OK");
      } catch (e) {
        console.log(e);
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

router.get('/users/verifyreset', async (req,res) => {
  
  if (req && req.query && req.query.key) {
    console.log(req.originalUrl);
    let check = req.originalUrl.replace("/users/verifyreset?key=",'');
    console.log(check);
    check = aes256.decrypt(SALT, check);
    console.log(check);
    let user = await User.getUser({email:check});
    
    if (user) {
      try {

        // res.send({email:user.Local.email});
        // res.status(200).send()
        resetlist[check] = true;
        res.status(200).send("back to your app to change new password")
      } catch (e) {
        console.log(e);
        res.status(500).send("server error")
      }
    } else {
      res.status(400).send("Bad request");
    }

  } else {
    res.status(400).send("Bad request");
  }
});

// router.post('/task/create',auth, async (req,res)=> {

//   try {
//     let user = req.user;
    
//     if(!user) {
//       res.status(400).send("bad request");
//       return;
//     }
//     if (!req.body || !req.body.title || !req.body.description || !req.body.start_time || !req.body.end_time) {
//       res.status(400).send("bad request");
//       return;
//     }
//     let newTask = _Task(req.user.email, req.body.title, req.body.description, req.body.start_time, req.body.end_time, req.body.frequency);
//     let tasks = user.tasks;
//     tasks.push(newTask);
//     console.log(user);
//     await User.updateTask(user.email, tasks);
//     res.status(200).send("OK")
//   } catch (error) {
//     console.log(error);
//     res.status(400).send("bad request");
//   }
// })

router.post('/task/update',auth, async (req,res)=> {
  try {
    let user = req.user;
    console.log(user);
    if(!user) {

      res.status(400).send("bad request");
      
      return;
    }
    if (!req.body) {

      res.status(400).send("bad request");
      return;
    }

    let tasks = user.tasks;
    if (!tasks || !tasks.timestamp) {
      await User.updateTask(user.email, req.body.tasks);
      res.status(200).send("OK");
      return;
    }
    if(tasks && tasks.timestamp <= req.body.tasks.timestamp) 
    {
      await User.updateTask(user.email, req.body.tasks);
      res.status(200).send("OK");
      return;
    }
    if(tasks.timestamp >= req.body.tasks.timestamp)
      {
        res.status(200).send({tasks:tasks});
        return;
      }
    
  } catch (error) {
    console.log(error);
    res.status(400).send("bad request");
  }
} )

router.get('/tasks/get',auth,async(req,res) => {

  try {
    let user = req.user;
    if(!user) {
      res.status(400).send("bad request");
      return;
    }

    const email = req.user.email;
  
    if (user && user.google_ref) {
      for (const k in user.google_ref) {
        if (Object.hasOwnProperty.call(user.google_ref, k)) {
          const i = user.google_ref[k];
          if (i.is_expired) continue;
          try {
            let data = await axios({
              method: 'post',
              url: `https://oauth2.googleapis.com/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${i.ref_token}`
            })
            // console.log(data);
            let token = data.data.access_token;
            try {
  
              console.log(token);
              let res = await axios({
                method: 'get',
                url: `https://www.googleapis.com/calendar/v3/calendars/${k}/events`,
                headers: {
                  Authorization: "Bearer " + token
                }
              });
              await  User.saveGoogleCalendarEvent(email, k, res.data.items);

            } catch (error) {
              // res.status(200).send("SYNCED FAILED");
              console.log(error);
            }
  
          } catch (error) {
            console.log(error);
            // let new_i = i;
            // new_i.is_expired = true;
            // console.log(new_i);
            // User.updateGoogleRefreshToken(email, new_i);
            // res.status(200).send("OK");
  
            // return;
          }
        }
      }
    }
    // res.status(200).send("OK");
    let tasks = {};
    if(user.tasks) tasks = user.tasks;
    if(user.google_events) tasks.google_events = user.google_events;
    
    res.status(200).send(tasks);
  } catch (error) {
    console.log(error);
    res.status(400).send("bad request");
  }
})

router.get('/task/deleteall',async(req,res) =>{
  if (req && req.query && req.query.email) {
    try {
      await User.updateTask(req.query.email,[]);
      res.status(200).send("OK");
    } catch (error) {
      res.status(400).send("KO");
    }

  } 
})

router.post('/users/avatar',auth ,async (req,res) => {
  if (!req.body) {
    res.status(400).send("bad reqeust");
  }
});

router.get('/users/avatar', auth, async (req,res) => {
  res.send(req.user.avatar);
});
router.get('/users/profile', auth, async (req,res) => {
  delete req.user.Local;
  res.send(req.user);
});

router.get('/sync/google' , auth, async (req, res) => {

  
  
  let user = req.user;
  const email = req.user.email;

  if (user && user.google_ref) {
    for (const k in user.google_ref) {
      if (Object.hasOwnProperty.call(user.google_ref, k)) {
        const i = user.google_ref[k];
        if (i.is_expired) continue;
        try {
          let data = await axios({
            method: 'post',
            url: `https://oauth2.googleapis.com/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${i.ref_token}`
          })
          // console.log(data);
          let token = data.data.access_token;
          try {

            console.log(token);
            let res = await axios({
              method: 'get',
              url: `https://www.googleapis.com/calendar/v3/calendars/${k}/events`,
              headers: {
                Authorization: "Bearer " + token
              }
            })
              
            await  User.saveGoogleCalendarEvent(email, k, res.data.items);

          } catch (error) {
            // res.status(200).send("SYNCED FAILED");
            console.log(error);
          }

        } catch (error) {
          console.log(error);
          // let new_i = i;
          // new_i.is_expired = true;
          // console.log(new_i);
          // User.updateGoogleRefreshToken(email, new_i);
          // res.status(200).send("OK");

          // return;
        }
      }
    }
  }
  res.status(200).send("OK");
} )

router.post('/audio',  async  (req,res) => {
  
  
  // intent
  const SHOW_TASK = "SHOW_TASK";
  const SHOW_DETAIL = "SHOW_DETAIL";
  const SELECT_TASK = "SELECT_TASK";
  const DIRECT  = "DIRECT";
  const SET_NOTI = "SET_NOTI";
  const SET_DUE = "SET_DUE";
  const SET_REMINDER = "SET_REMINDER";
  const DETAIL_TASK = "DETAIL_TASK";
  const YES = "YES";
  const CANCEL = "CANCEL";
  const CREATE = "CREATE";

  function _process(token) {
    for (const k in entity) {
      if (Object.hasOwnProperty.call(entity, k)) {
        if(entity[k][token]) return k;
        
      }
    }

  }
  try {



    if(!req || !req.body || !req.body.audio) {
      
      res.status(200).send("Please repeat");
      // return;
    }
    let f = 'audio.wav' + uuidv4();

    fs.writeFileSync(f,req.body.audio, 'base64');
    const handle = new Leopard(process.env.PICOKEY);
    const result = handle.processFile(f);
    fs.unlinkSync(f);
    console.log(result.transcript);
    let chunk = result.transcript.toLowerCase().split(' ');
    let intent = {};
    for (const i of chunk) {
      let t = _process(i);
      if(t =="NUMBER") {
        intent[t] = entity.NUMBER[i];
      } else {
        intent[t] = true;
      }
    }
    //intent curating
    let _intent ="";
    let _info = {};
    if(intent["NUMBER"] || intent["NUMBER"] == 0) {
      _info.number = intent["NUMBER"];
      intent["NUMBER"] = 1;
    }
    if(intent["AMPM"]) _info.ampm = intent["AMPM"];
    if(intent["TODAY"]) _info.day = "TODAY";
    if(intent["NEXT_DAY"]) _info.day = "NEXT_DAY";
    if(intent["EVENING"]) _info.time = "EVENING";
    if(intent["AFTERNOON"]) _info.time = "AFTERNOON";
    if(intent["MORNING"]) _info.time = "MORNING";
    if(intent["ON"]) _info.noti_status = "on"
    if(intent["OFF"]) _info.noti_status = "off"
    
    if(intent["TASK"] && intent["SHOW"]) _intent=SHOW_TASK;
    if(intent["DETAIL"] && intent["TASK"]) _intent=SHOW_DETAIL;
    if(intent["SELECT"] && intent["NUMBER"]) _intent=SELECT_TASK;
    
    if(intent["SET"]) {
      if(intent["NOTIFICATION"]) _intent=SET_NOTI;
      if(intent["DUE"]) _intent=SET_DUE;
      if(intent["REMINDER"]) _intent=SET_REMINDER;
    }
    if(intent["CREATE"]) _intent=CREATE;
    if(intent["DIRECT"]) _intent=DIRECT;
    if(intent["CANCEL"]) _intent=CANCEL;
    if(intent["YES"]) _intent=YES;

    console.log(_intent);
    res.status(200).send({intent: _intent, result: result.transcript , info:_info});

    // return;

  } catch (error) {
    console.log(error);
    res.status(200).send("Please repeat");
    // return
  }
} )

app.use(router);



const session = require('express-session');



app.use(session({
  maxAge: 86400000,
  resave: true,
  saveUninitialized: true,
  secret: 'SECRET' 
}));


var passport = require('passport');

 
app.use(passport.initialize());
app.use(passport.session());
 

app.get('/error', (req, res) => res.send("<h1>Error Sync failed"));
 
passport.serializeUser(function(user, cb) {
  cb(null, user);
});
 
passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


/*  Google AUTH  */
 
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

console.log(process.env.CLIENT_ID);
console.log(process.env.CLIENT_SECRET);

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL
  },
  async function(accessToken, refreshToken, profile, done) {
      console.log("refresh" + refreshToken);
      const email = profile.emails[0].value;
      const data ={email: email, token: refreshToken};
      // console.log(data);


      return done(null,data);
  }
));
 
app.get('/auth/google', function(req,res,next) {
  const state = req.query.appemail;

  const authenticator = passport.authenticate('google', 
{ scope : ['profile', 'email','https://www.googleapis.com/auth/calendar','https://www.googleapis.com/auth/tasks'] ,
state, accessType: 'offline',
}
)
  authenticator(req, res, next);
},  
  );
 
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/error' }),
  async function  (req, res) {
    // Successful authentication, redirect success.

    const appemail = req.query.state;
    const email = req.session.passport.user.email;
    const token = req.session.passport.user.token;
    // console.log(req.session.passport);
    let user = await User.getUser({email: appemail});
    if (!user){
      res.status(200).send("<h1>Sync failed, appemail is invalid!</h1>");
      return;
    }
    User.updateGoogleRefreshToken(appemail, {email: email, token: token});

    res.status(200).send(`<h1>Authorized google calendar events of ${email} into ${appemail} accounts success! </h1>`)
  });

// function getReqSessionId(req, res, next) {
//   console.log(req.session);
//   next();
// }

  app.listen(PORT, () => {
    console.log("listen on port: " + PORT);
  })
  