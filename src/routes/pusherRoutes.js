import express from 'express';
import pusherService from '../services/pusherService.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/pusher/auth
 * @desc    Authenticate Pusher private channel subscription
 * @access  Private
 */
router.post('/auth', verifyToken, (req, res) => {
  try {
    const { socket_id, channel_name } = req.body;

    if (!socket_id || !channel_name) {
      return res.status(400).json({
        success: false,
        message: 'socket_id and channel_name are required'
      });
    }

    const user = {
      id: req.user.id,
      name: req.user.name,
      role: req.user.role
    };

    const authResponse = pusherService.authenticateChannel(socket_id, channel_name, user);
    res.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    res.status(403).json({
      success: false,
      message: 'Channel authentication failed'
    });
  }
});

/**
 * @route   POST /api/pusher/typing
 * @desc    Trigger typing indicator to receiver
 * @access  Private
 */
router.post('/typing', verifyToken, async (req, res) => {
  try {
    const { receiverId, isTyping } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'receiverId is required'
      });
    }

    const event = isTyping ? 'user_typing' : 'user_stop_typing';

    await pusherService.triggerToUser(receiverId, event, {
      senderId: req.user.id,
      senderName: req.user.name
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Typing indicator error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send typing indicator'
    });
  }
});

/**
 * @route   POST /api/pusher/mark-read
 * @desc    Notify sender that messages were read
 * @access  Private
 */
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({
        success: false,
        message: 'senderId is required'
      });
    }

    await pusherService.triggerToUser(senderId, 'messages_read', {
      readerId: req.user.id,
      readerName: req.user.name
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Mark read notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send read notification'
    });
  }
});

export default router;
