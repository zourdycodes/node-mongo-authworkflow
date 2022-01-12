import cloudinary from 'cloudinary';
import fs from 'fs';
import { UserControl } from './UserControllers';
import { Request, Response } from 'express';
import { removeTemp } from '..//utils/removeTemp';

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME!,
  api_key: process.env.CLOUD_API_KEY!,
  api_secret: process.env.CLOUD_API_SECRET!,
});

interface File {
  tempFilePath: string;
}

class UploadControl extends UserControl {
  public uploadAvatar(req: Request, res: Response) {
    try {
      const file = req.files?.file as File;

      return cloudinary.v2.uploader.upload(
        file?.tempFilePath,
        {
          folder: 'avatar',
          width: 150,
          height: 150,
          crop: 'fill',
        },
        async (error, result) => {
          if (error) throw error;

          removeTemp(file?.tempFilePath);

          return res.json({ url: result?.secure_url });
        }
      );
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
}

export const uploadControl = new UploadControl();
