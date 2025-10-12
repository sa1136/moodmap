import { Router } from "express";

const router = Router();

// Temporary mock endpoint
router.get("/", (req, res) => {
  res.json([
    { id: 1, name: "Quiet Cafe", type: "cafe", rating: 4.5 },
    { id: 2, name: "City Park", type: "park", rating: 4.2 }
  ]);
});

export default router;
