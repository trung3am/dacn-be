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
const aes256 = require('aes256');
const {  SendMail } = require('./services/mail-service');
router = new express.Router();
let resetlist = [];
router.post('/users/create',async (req, res) => {
  if (req && req.body && req.body.email && req.body.password) {
    try {
      let user =  await User.createNewUserWithPassword(req.body.email, req.body.password);

      if (user) {
        console.log(user);
        token = jwt.sign({_id:user.insertedId.toString() }, SALT);
        res.status(201).send({user:req.body.email, token:token});

      } else {
        res.status(400).send("Bad request");
      }
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
      token = jwt.sign({_id:user }, SALT);
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
  if (req && req.body && req.body.email && req.body.newPassword && req.body.secret) {
    let user = await User.getUser({email:req.body.email});
    let check = aes256.decrypt(SALT, req.body.secret);
    if(!resetlist[check]) return res.status(400).send("bad request");
    if (user && user.Local.email === check) {
      try {
        let update = await User.changePassword(req.body.email, req.body.newPassword);
        console.log(update);
        delete resetlist[check];
        res.send("OK");
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
        await SendMail(req.body.email, secret);
        resetlist[req.body.email] = true;
        res.send("OK");
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

router.post('/users/verifyreset', async (req,res) => {
  
  if (req && req.query && req.query.key) {
    console.log(req.originalUrl);
    let check = req.originalUrl.replace("/users/verifyreset?key=",'');
    console.log(check);
    check = aes256.decrypt(SALT, check);
    console.log(check);
    if(!resetlist[check]) return res.status(400).send("bad request");
    let user = await User.getUser({email:check});
    
    if (user) {
      try {

        res.send({email:user.Local.email});
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