import Users from '../models/UserSchema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { sendMail } from './sendMail';

interface TypedRequest<T> extends Request {
  body: T;
}

class UserControl {
  async register(
    req: TypedRequest<{ name: string; email: string; password: string }>,
    res: Response
  ) {
    try {
      // get the user data from client
      const { name, email, password } = req.body;

      // create a guard close
      if (!name || !email || !password) {
        return res.status(400).json({
          message: 'Please fill in all fields correctly!',
          error: true,
        });
      }

      // validating email
      if (!validateEmail(email)) {
        return res
          .status(400)
          .json({ message: 'email is invalid!', error: true });
      }

      // check if email has already registered
      const user = await Users.findOne({ email });
      if (user) {
        return res.status(400).json({
          message: 'This email has already registered in our database',
          error: true,
        });
      }

      // hashing password
      if (password.length < 6) {
        return res.status(400).json({
          message: 'password must be at least 6 characters',
          error: true,
        });
      }

      const passwordHashed = await bcrypt.hash(password, 12);

      const newUser = { name, email, password: passwordHashed };

      const activation_token = createActivationToken(newUser);

      const url = `${process.env.CLIENT_URL}/user/activate/${activation_token}`;
      sendMail(email, url, 'please, verify your email address!');

      return res.status(200).json({
        message: 'successfully registered!',
        registered: true,
        data: newUser,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export const userControl = new UserControl();

// helpers

interface Payload {
  name: string;
  email: string;
  password: string;
}

function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function createActivationToken(payload: Payload) {
  return jwt.sign(payload, process.env.ACTIVATION_TOKEN_SECRET!, {
    expiresIn: '5m',
  });
}
