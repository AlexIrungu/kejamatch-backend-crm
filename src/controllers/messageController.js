import mongoose from 'mongoose';
import Message from '../models/MessageModel.js';
import Client from '../models/ClientModel.js';
import User from '../models/User.js';
import socketService from '../services/socketService.js';

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required' });
    }

    const senderType = req.user.role || 'client';
    const senderId = req.user.id || req.user._id;

    let senderName;
    if (senderType === 'client') {
      const client = await Client.findById(senderId);
      senderName = client?.name || 'Client';
    } else {
      const user = await User.findById(senderId);
      senderName = user?.name || 'Agent';
    }

    let receiverType;
    const clientReceiver = await Client.findById(receiverId);
    if (clientReceiver) {
      receiverType = 'client';
    } else {
      const userReceiver = await User.findById(receiverId);
      receiverType = userReceiver?.role || 'agent';
    }

    const message = await Message.create({
      senderType,
      senderId,
      senderName,
      receiverType,
      receiverId,
      content
    });

    // Emit real-time notification to receiver
    socketService.emitToUser(receiverId, 'new_message', {
      message,
      senderName,
      senderType
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// Get conversation with a specific user
export const getConversation = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { partnerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversation' });
  }
};

// Get all conversations (list of unique partners with last message)
export const getConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id || req.user._id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }]
        }
      },
      {
        $addFields: {
          partnerId: {
            $cond: {
              if: { $eq: ['$senderId', userId] },
              then: '$receiverId',
              else: '$senderId'
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$partnerId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    const results = await Promise.all(
      conversations.map(async (conv) => {
        const partnerId = conv._id;
        let partnerName = 'Unknown';
        let partnerType = 'agent';

        const client = await Client.findById(partnerId);
        if (client) {
          partnerName = client.name;
          partnerType = 'client';
        } else {
          const user = await User.findById(partnerId);
          if (user) {
            partnerName = user.name;
            partnerType = user.role;
          }
        }

        return {
          partnerId,
          partnerName,
          partnerType,
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount
        };
      })
    );

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get conversations' });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const { partnerId } = req.params;

    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, read: false },
      { read: true, readAt: new Date() }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const count = await Message.countDocuments({ receiverId: userId, read: false });
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};
