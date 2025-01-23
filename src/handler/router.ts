import * as path from 'path'

import { Router } from 'express'
import type { Request, Response } from 'express'
import multer from 'multer'

import { generateUUID } from '../utils/common'

import { handleInvokeFunction } from './invoke'

/**
 * multer uploader config
 */
const uploader = multer({
  storage: multer.diskStorage({
    filename: (_req, file, cb) => {
      const { ext } = path.parse(file.originalname)
      cb(null, generateUUID() + ext)
    },
  }),
  fileFilter(_req, file, callback) {
    // solve the problem of garbled unicode names
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')
    callback(null, true)
  },
})

export const router: Router = Router()

router.get('/_/healthz', (_req, res) => {
  res.status(200).send('ok')
})

/**
 * Invoke function through HTTP request.
 * @method *
 */
// router.all('/:name', uploader.any(), handleInvokeFunction)
router.all('*', uploader.any(), async (req: Request, res: Response): Promise<void> => {
  let funcName = req.path

  // remove the leading slash
  if (funcName.startsWith('/')) {
    funcName = funcName.slice(1)
  }

  // check length
  if (funcName.length > 256) {
    res.status(500).json({
      error: 'Function name is too long',
      maxLength: 256,
    })
    return
  }

  req.params.name = funcName
  await handleInvokeFunction(req, res, funcName)
  return
})
