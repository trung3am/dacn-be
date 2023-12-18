const MongoDBService = require('../services/mongodb-service');
const bcrypt = require('bcrypt');
const saltRounds = 3;



class User {
  constructor() {

  }
  async verifyAccount (email) {
    return await MongoDBService.update('users', {email:email} ,{ $set:{verify:true}});
  }
  async createNewUserWithPassword (email, password) {
    let hash  = await bcrypt.hash(password, saltRounds);
    let user = {email:email , 
      verify:false,
      Local:{password: hash,
         email: email},
      events:{},
      tasks:{},
      reminders:{},
      notes:{},
      avatar_image:null,
      phone:null,
      facebook:{id:null, email:null},
      google:{id:null, email:null},
      devices:{}
        };
    try {
      let res = await MongoDBService.insert('users', [user
      ]);
      return res;
    } catch (e) {
      return;
    }
  }
  async loginWithPassword(email, password) {

    let user = await MongoDBService.findOne('users',{email:email});
    let hash = "";
    if(user && user.length != 0) {
      hash = user.Local.password;
    }
    console.log(user);
    let check =  await bcrypt.compare(password,hash);
    console.log(check);
    if (check) {
      return {_id:user._id.toString(), verify:user.verify, devices:user.devices, phone_number: user.phone_number, name: user.name, google_ref: user.google_ref};
    }
    return;
    
  }
  async getUser(query) {
    return await MongoDBService.findOne('users', query);
  }
  async changePassword(email, newPassword) {
    let Local = {
      email:email,
      password:  await bcrypt.hash(newPassword, saltRounds)
    }

    
    return await MongoDBService.update('users', {email:email} ,{ $set:{Local:Local}});
  }
  async updateTask(email,tasks) {
    return await MongoDBService.update('users', {email:email} ,{ $set:{tasks:tasks}});
  }
  async saveGoogleCalendarEvent(email,gmail ,events) {
    let user = await this.getUser({email:email});
    let google_events = user.google_events;
    if(!google_events) {
      google_events = {};
    }
    google_events[gmail] = events;
    return await MongoDBService.update('users', {email:email} ,{ $set:{google_events:google_events}});
  }
  async updateDevice(email,devices) {
    return await MongoDBService.update('users', {email:email} ,{ $set:{devices:devices}});
  }
  async updateGoogleRefreshToken(email, token) {
    let user = await this.getUser({email:email});
    let ref = {};
    if (user.google_ref) ref = user.google_ref;
    ref[token.email] = {
      ref_token: token.token,
      email: token.email,
      is_expired: false,
      sync: true
    }
    return await this.updateUser(email, {google_ref: ref});
  }
  async getAllUsers() {
    return await MongoDBService.find('users');
  }
  async updateUser(email, update) {
    return await MongoDBService.update('users', {email:email} ,{ $set:update});
  }
  async removeSyncedGmail(email, gmail) {
    let user = await this.getUser({email:email});
    if (user.google_ref) {
      let ref = user.google_ref;
      delete ref[gmail];
      console.log(ref);
      if (user.google_events) {
        let g_events = user.google_events;
        delete g_events[gmail];
        return await MongoDBService.update('users', {email:email} ,{ $set:{google_ref: ref, google_events: g_events}});
      }
      return await MongoDBService.update('users', {email:email} ,{ $set:{google_ref: ref}});
    }

    
  }
}


module.exports = new User();