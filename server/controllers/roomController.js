import Room from '../models/Room.js';
import User from '../models/User.js';

// Helper to generate a random 6-character room code
const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createRoom = async (req, res) => {
    try {
        const { roomName, roomCode } = req.body;
        const code = roomCode || generateRoomCode();
        
        const existingRoom = await Room.findOne({ code });
        if (existingRoom) {
            return res.status(400).json({ message: 'Room code already exists.' });
        }

        const room = await Room.create({
            code,
            name: roomName || `${req.user.name}'s Room`,
            creator: req.user._id,
            members: [{
                user: req.user._id,
                role: 'creator',
                status: 'online'
            }],
            tasks: [],
            messages: []
        });

        // Fetch completely populated room bundle
        return fetchRoomBundle(code, req.user, res, true);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

export const joinRoom = async (req, res) => {
    try {
        const { roomCode } = req.body;
        if (!roomCode) {
            return res.status(400).json({ message: 'Room code is required.' });
        }

        const room = await Room.findOne({ code: roomCode.toUpperCase() });
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        const isMember = room.members.find(m => m.user.toString() === req.user._id.toString());
        if (!isMember) {
            room.members.push({
                user: req.user._id,
                role: 'member',
                status: 'online'
            });
            await room.save();
        }

        return fetchRoomBundle(room.code, req.user, res, false);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

export const getRoomTasks = async (req, res) => {
    try {
        const { roomCode } = req.query;
        const room = await Room.findOne({ code: roomCode }).populate('tasks.assignedTo tasks.completedBy', 'name');
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        const tasks = room.tasks.map(t => ({
            id: t._id,
            title: t.title,
            assignedToId: t.assignedTo?._id,
            assignedToName: t.assignedTo?.name,
            completed: t.completed,
            completedBy: t.completedBy?.name,
            updatedAt: t.updatedAt
        }));

        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

export const getRoomMembers = async (req, res) => {
    try {
        const { roomCode } = req.query;
        const room = await Room.findOne({ code: roomCode }).populate('members.user', 'name email avatar');
        if (!room) {
            return res.status(404).json({ message: 'Room not found.' });
        }

        const members = room.members.map(m => ({
            id: m.user._id,
            name: m.user.name,
            email: m.user.email,
            avatar: m.user.avatar,
            role: m.role,
            status: m.status
        }));

        res.status(200).json(members);
    } catch (error) {
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

const fetchRoomBundle = async (roomCode, user, res, isCreator) => {
    // Helper function to return the full state to frontend
    const room = await Room.findOne({ code: roomCode.toUpperCase() })
        .populate('creator', 'name')
        .populate('members.user', 'name email avatar')
        .populate('tasks.assignedTo tasks.completedBy', 'name')
        .populate('messages.user', 'name avatar');

    if (!room) {
        return res.status(404).json({ message: 'Room not found.' });
    }

    const members = room.members.map(m => ({
        id: m.user._id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        role: m.role,
        status: m.status
    }));

    const tasks = room.tasks.map(t => ({
        id: t._id,
        title: t.title,
        assignedToId: t.assignedTo?._id,
        assignedToName: t.assignedTo?.name,
        completed: t.completed,
        completedBy: t.completedBy?.name,
        updatedAt: t.updatedAt
    }));

    const messages = room.messages.map(m => ({
        id: m._id,
        userId: m.user._id,
        username: m.user.name,
        avatar: m.user.avatar,
        message: m.message,
        timestamp: m.createdAt,
        workFocused: m.workFocused
    }));

    res.status(200).json({
        room: {
            code: room.code,
            name: room.name,
            creatorId: room.creator._id,
            creatorName: room.creator.name,
            isCreator: room.creator._id.toString() === user._id.toString(),
            createdAt: room.createdAt
        },
        members,
        tasks,
        messages,
        sharedTimer: room.sharedTimer
    });
};
