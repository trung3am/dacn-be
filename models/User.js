const MongoDBService = require('../services/mongodb-service');
const bcrypt = require('bcrypt');
const saltRounds = 3;



class User {
  constructor() {

  }
  async createNewUserWithPassword (email, password) {
    let hash  = await bcrypt.hash(password, saltRounds);
    let user = {email:email , 
      Local:{password: hash,
         email: email},
      events:[],
      tasks:[],
      reminders:[],
      notes:[],
      avatar_image:null,
      phone:null,
      facebook:{id:null, email:null},
      google:{id:null, email:null}

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
    if(user.length != 0) {
      hash = user.Local.password;
    }
    console.log(user);
    let check =  await bcrypt.compare(password,hash);
    console.log(check);
    if (check) {
      return user._id;
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
}

module.exports = new User();