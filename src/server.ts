import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
// import path from 'path';
// import fileUpload from 'express-fileupload';

(() => {
  const app = express();

  // miscellaneous
  app.use(express.json());
  app.use(cors());
  app.use(cookieParser());

  // routes

  // connect to db
  const URI = process.env.MONGODB_URL ?? '';
  mongoose.connect(
    URI,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: true,
    },
    (err) => {
      if (err) throw err;
      console.log('connected to db');
    }
  );

  const PORT = process.env.PORT ?? 5000;
  app.listen(PORT, () => {
    console.log(`server is running on port:${PORT}`);
  });
})();
