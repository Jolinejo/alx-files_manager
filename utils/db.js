const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.url = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.db = null;

    this.client.connect()
      .then(() => {
        console.log('Connected to MongoDB');
        this.db = this.client.db(this.database);
      })
      .catch((err) => {
        this.db = null;
        console.error(err);
      });
  }

  isAlive() {
    return !!this.db;
  }

  async nbUsers() {
    const number = await this.db.collection('users').countDocuments();
    return number;
  }

  async nbFiles() {
    const number = await this.db.collection('files').countDocuments();
    return number;
  }
}

const dbClient = new DBClient();
export default dbClient;
