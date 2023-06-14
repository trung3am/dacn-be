const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

class MongoDBService {
  constructor() {
    
    if (process.env.MONGODBURL && process.env.DATABASE_NAME) {
      this.url = process.env.MONGODBURL;
      this.dbName = process.env.DATABASE_NAME;
    } else {
      throw new Error('missing url to connect to mongo cloud database');
    }
    this.client = new MongoClient(this.url);
    this.db = this.client.db(this.dbName);
    
  }
  toObjectId(object) {
    try {
      if(object && object._id) object._id = new ObjectId(object._id);
    } catch (error) {
      
    }
  } 

  find(collection, query = {}) {
    this.toObjectId(query);
    let dBCollection = this.db.collection(collection);
    return dBCollection.find(query).toArray();
  }

  findOne(collection, query = {}) {
    this.toObjectId(query);
    let dBCollection = this.db.collection(collection);
    return dBCollection.findOne(query);
  }

  async insert(collection, data = []) {
    let dBCollection = this.db.collection(collection);
    if (data.length==0) return "no data to save";
    try {
      return await dBCollection.insertOne(data[0]);
      
    } catch (error) {
      console.log(error);
    }
  }
  update(collection, filter = {}, update = {}) {
    this.toObjectId(filter);
    let dBCollection = this.db.collection(collection);
    console.log(filter);
    console.log(update);
    return dBCollection.updateOne(filter, update);
  }
  delete(collection, filter = {}) {
    if (filter && Object.keys(filter).length == 0) return "no filter";
    this.toObjectId(filter);

    let dBCollection = this.db.collection(collection);
    return dBCollection.deleteMany(filter);
  }
}

module.exports = new MongoDBService();