import Users from '../models/UserSchema';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import { sendMail } from './sendMail';

export interface TypedRequest<T> extends Request {
  body: T;
  user?: T;
}

export interface Payload {
  name?: string;
  email?: string;
  password?: string;
  id?: string | number;
}

export class UserControl {
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

      // hashing password
      const passwordHashed = await bcrypt.hash(password, 12);

      // new user
      const newUser = { name, email, password: passwordHashed };

      // create an activation token for a new user
      const activation_token = createActivationToken(newUser);

      // handling email activation
      const url = `${process.env.CLIENT_URL}/user/activate/${activation_token}`;
      sendMail(email, url, 'please, verify your email address!');

      // send to the server the success result
      return res.status(200).json({
        message: 'successfully registered!',
        registered: true,
        data: newUser,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async activateAccount(
    req: TypedRequest<{ activation_token: string }>,
    res: Response
  ) {
    try {
      // get token from client
      const { activation_token } = req.body;

      // verify the handshake
      const user = jwt.verify(
        activation_token,
        process.env.ACTIVATION_TOKEN_SECRET!
      );

      // destructure the user
      const { name, email, password } = user as Payload;

      // check if there is any user in the database with given email address
      const check = await Users.findOne({ email });

      // if there is any: return error
      if (check)
        return res
          .status(400)
          .json({ message: 'this email is already exist!' });

      // if all good create new User in the database
      const newUser = new Users({
        name,
        email,
        password,
      });

      // save new registered user
      await newUser.save();

      return res.status(200).json({
        message: 'your account has been activated!',
        activated: true,
      });
    } catch (error) {
      return res.status(500).json({
        message: `cannot activate your account, ${error.message}`,
      });
    }
  }

  async login(
    req: TypedRequest<{ email: string; password: string }>,
    res: Response
  ) {
    try {
      //  get email and password from client
      const { email, password } = req.body;

      // check if there is a user in the database with given email address
      const user = await Users.findOne({ email });

      // check if there is no user with given email return error
      if (!user) {
        return res
          .status(400)
          .json({ message: 'This email does not exist in our database!' });
      }

      // compare the hash password and check if its matched or not
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password!' });
      }

      // refresh token when login (with given user is from database) and the token long last for 7 days
      const refresh_token = createRefreshToken({ id: user._id });
      res.cookie('refreshToken', refresh_token, {
        httpOnly: true,
        path: '/user/refresh_token',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // if all good return => login success!
      return res.status(200).json({
        message: 'Login success!',
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async logout(_req: Request, res: Response) {
    try {
      res.clearCookie('refreshToken', { path: '/user/refresh_token' });
      return res.status(200).json({ message: 'user logged out!' });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  getRefreshToken(req: Request, res: Response) {
    try {
      const refreshToken: string = req.cookies?.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({ message: 'please login first!' });
      }

      const tokenAccess = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      );

      if (!tokenAccess) {
        return res
          .status(403)
          .json({ message: 'please login first to get the token!' });
      }

      const user = tokenAccess as Payload;

      const access_token = createAccessToken({
        id: user.id,
      });

      return res.status(200).json({ access_token });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async forgotPassword(req: TypedRequest<{ email: string }>, res: Response) {
    try {
      // get the email from the client
      const { email } = req.body;

      // get user from DB with given email address
      const user = await Users.findOne({ email });

      // check if there is any user with given email in our database
      if (!user) {
        return res.status(404).json({ message: 'This email does not exist!' });
      }

      // create an access token
      const access_token = createAccessToken({ id: user._id });
      const url = `${process.env.CLIENT_URL}/user/reset/${access_token}`;

      // send the email with SMTP protocol to the user email address
      sendMail(email, url, 'Reset your password!');
      return res.status(200).json({ message: 'please check our email' });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export const userControl = new UserControl();

// helpers

function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

export function createActivationToken(payload: Payload) {
  return jwt.sign(payload, process.env.ACTIVATION_TOKEN_SECRET!, {
    expiresIn: '5m',
  });
}

export function createAccessToken(payload: Payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: '15m',
  });
}

export function createRefreshToken(payload: Payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: '7d',
  });
}
