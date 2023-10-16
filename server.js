const express = require('express');
require('dotenv').config();
const cors = require('cors')
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const app = express();
app.use(cors());
const auth = require('./middleware/auth');
app.use(express.json())
const PORT = process.env.PORT;
const SALT = process.env.SALT;
const BEURL = process.env.BEURL  || "http://localhost:8088"
const aes256 = require('aes256');
const CryptoJS = require('rn-crypto-js')
const {  SendMail } = require('./services/mail-service');
router = new express.Router();
let resetlist = {};
const { v4: uuidv4 } = require('uuid');

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
// const schedule = require('node-schedule');

// const rule = new schedule.RecurrenceRule();
// rule.second = 20;

// const job = schedule.scheduleJob(rule, function(){
//   console.log('The answer to life, the universe, and everything!');
// });


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
        console.log(user);
        res.status(401).send("unauthorized");
        return;
      }
      token = jwt.sign({_id:user._id }, SALT);
      res.status(200).send({user:req.body.email, token:token});
      
    } else {
      res.status(400).send("Bad request");
    }
  } else {
    res.status(400).send("Bad request");
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

router.post('/task/create',auth, async (req,res)=> {

  try {
    let user = req.user;
    
    if(!user) {
      res.status(400).send("bad request");
      return;
    }
    if (!req.body || !req.body.title || !req.body.description || !req.body.start_time || !req.body.end_time) {
      res.status(400).send("bad request");
      return;
    }
    let newTask = _Task(req.user.email, req.body.title, req.body.description, req.body.start_time, req.body.end_time, req.body.frequency);
    let tasks = user.tasks;
    tasks.push(newTask);
    console.log(user);
    await User.updateTask(user.email, tasks);
    res.status(200).send("OK")
  } catch (error) {
    console.log(error);
    res.status(400).send("bad request");
  }
})

router.post('/task/update',auth, async (req,res)=> {
  try {
    let user = req.user;
    
    if(!user) {

      res.status(400).send("bad request");
      
      return;
    }
    if (!req.body || !req.body._id) {

      res.status(400).send("bad request");
      return;
    }

    let tasks = user.tasks;
    for (const i of tasks) {
      if (i._id == req.body._id) {
        i.title = req.body.title ? req.body.title : i.title;
        i.description = req.body.description ? req.body.description : i.description;
        i.frequency = req.body.frequency ? req.body.frequency : i.frequency;
        i.status = req.body.status ? req.body.status : i.status;
        i.start_time = req.body.start_time ? req.body.start_time : i.start_time;
        i.end_time = req.body.end_time ? req.body.end_time : i.end_time;
        break;
      }
    }
    // console.log(user);
    await User.updateTask(user.email, tasks);
    res.status(200).send("OK")
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
    res.status(200).send(user.tasks);
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

app.use(router);

app.listen(PORT, () => {
  console.log("listen on port: " + PORT);
})