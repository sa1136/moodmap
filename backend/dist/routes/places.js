"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Temporary mock endpoint
router.get("/", (req, res) => {
    res.json([
        { id: 1, name: "Quiet Cafe", type: "cafe", rating: 4.5 },
        { id: 2, name: "City Park", type: "park", rating: 4.2 }
    ]);
});
exports.default = router;
