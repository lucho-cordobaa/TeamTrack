import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { join } from 'path';

export const UPLOADS_DIR = join(process.cwd(), 'uploads');
export const UPLOADS_URL_PREFIX = '/api/uploads';

// La extensión sale de esta lista y no del nombre original, así el archivo siempre se sirve como imagen.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const exerciseImageUpload = {
  storage: diskStorage({
    destination: join(UPLOADS_DIR, 'exercises'),
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${ALLOWED_IMAGE_TYPES[file.mimetype]}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: { mimetype: string }, callback: any) => {
    if (ALLOWED_IMAGE_TYPES[file.mimetype]) {
      callback(null, true);
    } else {
      callback(new BadRequestException('La imagen debe ser JPG, PNG, WEBP o GIF'), false);
    }
  },
};
