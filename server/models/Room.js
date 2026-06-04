import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  role: {
    type: String,
    enum: ['creator', 'member'],
    default: 'member',
  },
  status: {
    type: String,
    enum: ['online', 'away'],
    default: 'online',
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  completed: {
    type: Boolean,
    default: false,
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  workFocused: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [memberSchema],
  tasks: [taskSchema],
  messages: [messageSchema],
  sharedTimer: {
    phase: {
      type: String,
      default: 'focus'
    },
    secondsLeft: {
      type: Number,
      default: 1500
    },
    isRunning: {
      type: Boolean,
      default: false
    },
    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cycleCount: {
      type: Number,
      default: 0
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  }
}, { timestamps: true });

// Pre-save hook to prevent duplicate members
roomSchema.pre('save', async function() {
  // Remove duplicate members (same user ID)
  const seenUserIds = new Set();
  const uniqueMembers = [];
  
  for (const member of this.members) {
    const userId = member.user._id ? member.user._id.toString() : member.user.toString();
    if (!seenUserIds.has(userId)) {
      seenUserIds.add(userId);
      uniqueMembers.push(member);
    }
  }
  
  this.members = uniqueMembers;
});

const Room = mongoose.model('Room', roomSchema);

export default Room;
