const MongoDBService = require('../services/mongodb-service');
const bcrypt = require('bcrypt');
const saltRounds = 3;



class Group {
  constructor() {

  }

  async createGroup (email, group_name) {

    let group = {
      name:group_name,
      created_by:email , 
      members:{},
      tasks:{}
        };
    group.members[email] = true;
    try {
      let res = await MongoDBService.insert('groups', [group
      ]);
      return res;
    } catch (e) {
      return;
    }
  }
  
  async getAllGroups() {
    return await MongoDBService.find('groups');
  };
  async getGroup(query) {
    return await MongoDBService.findOne('groups', query);
  }
  async updateTask(_id, _task) {
    let group = await MongoDBService.getGroup({_id: _id});
    let tasks = group.tasks;
    tasks[_task._id] = _task;
    
    return await MongoDBService.update('groups', {_id:_id} ,{ $set:{tasks:tasks}});
  }
  async addMember(_id, email) {
    let group = await MongoDBService.getGroup({_id: _id});
    let members = group.members;
    members[email] = true;
    return await updateMembers(_id,members);
  }

  async removeMember(_id, email) {
    let group = await MongoDBService.getGroup({_id: _id});
    let members = group.members;
    delete members[email];
    return await updateMembers(_id,members);
  }

  async updateMembers(_id, members) {
    return await MongoDBService.update('groups', {_id:_id} ,{ $set:{members:members}});
  }
}


module.exports = new Group();