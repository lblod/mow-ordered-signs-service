import express from "express";

const router = express.Router();

router.post("/delta", (req, res) => {
  console.log("receiving delta");
});
