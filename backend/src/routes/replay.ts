import express from 'express'
import multer from 'multer'
import path from 'path'
import { processReplay } from '../services/replayService.js'

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `replay-${uniqueSuffix}${path.extname(file.originalname)}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000'), // 500MB default
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.dem') {
      cb(null, true)
    } else {
      cb(new Error('Only .dem files are allowed'))
    }
  },
})

// Upload and process replay
router.post('/upload', upload.single('replay'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // TODO: Get userId from authentication middleware
    const userId = req.body.userId || null

    // Process the replay asynchronously
    const result = await processReplay(req.file.path, userId)

    res.json({
      message: 'Replay uploaded and queued for processing',
      matchId: result.matchId,
      status: result.status,
    })
  } catch (error) {
    next(error)
  }
})

export default router
