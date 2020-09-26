
import * as mongoose from "mongoose";

class DatabaseUtil {
  public mongoUrl: string = 'mongodb://localhost/CRMdb';
  private mongoSetup(): void {
    // mongoose.Promise = global.Promise;
    mongoose.connect(this.mongoUrl, { useNewUrlParser: true });
  }
}