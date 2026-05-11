import GameScore from "../models/GameScore.js";

// Helper to get start and end of current month
const getCurrentMonthRange = () => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    return { start, end };
};

// @route   POST /api/games/score
// @desc    Submit a new game score
export const submitScore = async (req, res) => {
  try {
    const { game, score } = req.body;
    const studentId = req.user.id;

    console.log(`Submitting score for ${game}: ${score} (Student: ${studentId})`);

    if (!game || score === undefined) {
      return res.status(400).json({ message: "Game and score are required" });
    }

    const { start, end } = getCurrentMonthRange();

    // Find and update if better, or create new
    const existing = await GameScore.findOne({
      student: studentId,
      game,
      createdAt: { $gte: start, $lt: end }
    });

    if (existing) {
      const isHigherBetter = game === "chembattle";
      const shouldUpdate = isHigherBetter ? Number(score) > existing.score : Number(score) < existing.score;

      if (shouldUpdate) {
        console.log(`Updating ${isHigherBetter ? "high" : "best"} score: ${existing.score} -> ${score}`);
        existing.score = Number(score);
        await existing.save();
        return res.status(200).json({ message: "This month's high score updated!", data: existing });
      } else {
        console.log(`Score not better: ${score} vs ${existing.score}`);
        return res.status(200).json({ message: "Score submitted. Your existing monthly score is still better.", data: existing });
      }
    }

    console.log(`First score of the month: ${score}`);
    const newScore = await GameScore.create({
      student: studentId,
      game,
      score: Number(score),
    });

    res.status(201).json({ message: "First score of the month submitted!", data: newScore });
  } catch (error) {
    console.error("error submitting score", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   GET /api/games/leaderboard/:game
// @desc    Get top 10 scores for a game (Current Month)
export const getLeaderboard = async (req, res) => {
  try {
    const { game } = req.params;
    const { start, end } = getCurrentMonthRange();

    const scores = await GameScore.find({ 
        game,
        createdAt: { $gte: start, $lt: end }
      })
      .sort({ score: game === "chembattle" ? -1 : 1 }) // Higher is better for chembattle, else lower
      .limit(10)
      .populate("student", "name indexNumber batch profileImage");

    res.status(200).json(scores);
  } catch (error) {
    console.error("error getting leaderboard", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @route   GET /api/games/my-score/:game
// @desc    Get student's current best score for a game (Current Month)
export const getUserScore = async (req, res) => {
    try {
      const { game } = req.params;
      const studentId = req.user.id;
      const { start, end } = getCurrentMonthRange();
  
      const score = await GameScore.findOne({ 
          student: studentId, 
          game,
          createdAt: { $gte: start, $lt: end }
        });
  
      res.status(200).json(score);
    } catch (error) {
      console.error("error getting user score", error);
      res.status(500).json({ message: "Server error" });
    }
  };
