"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
let users = [];
router.post('/', (req, res) => {
    try {
        const { name, city, preferences } = req.body;
        if (!name || !city) {
            return res.status(400).json({
                error: 'Name and city are required'
            });
        }
        const user = {
            id: (0, uuid_1.v4)(),
            name: name.trim(),
            city: city.trim(),
            preferences: preferences || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const existingUserIndex = users.findIndex(u => u.name.toLowerCase() === user.name.toLowerCase() &&
            u.city.toLowerCase() === user.city.toLowerCase());
        if (existingUserIndex >= 0) {
            users[existingUserIndex] = Object.assign(Object.assign({}, user), { id: users[existingUserIndex].id });
        }
        else {
            users.push(user);
        }
        res.status(201).json({
            message: 'User preferences saved successfully',
            user: {
                id: user.id,
                name: user.name,
                city: user.city,
                preferences: user.preferences
            }
        });
    }
    catch (error) {
        console.error('Error saving user preferences:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
exports.default = router;
