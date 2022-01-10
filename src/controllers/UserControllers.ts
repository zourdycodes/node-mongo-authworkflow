import Users from '../models/UserSchema';
// import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

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

      // check if email has already registered
      const user = await Users.findOne({ email });
      if (user) {
        return res.status(400).json({
          message: 'This email has already registered in our database',
          error: true,
        });
      }

      return res
        .status(200)
        .json({ message: 'successfully registered!', registered: true });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export const userControl = new UserControl();
