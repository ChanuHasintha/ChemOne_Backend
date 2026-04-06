import SpotTest from '../models/SpotTest.js';
import Submission from '../models/Submission.js';

// Create a new Spot Test (Admin only)
export const createTest = async (req, res) => {
  try {
    const { title, description, duration, batch, questions } = req.body;
    
    // CreatedBy comes from auth middleware (protect)
    const newTest = await SpotTest.create({
      title,
      description,
      duration,
      batch,
      questions,
      createdBy: req.user.id 
    });

    res.status(201).json({
      success: true,
      message: "Spot Test created successfully",
      test: newTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating spot test",
      error: error.message
    });
    console.error("Backend TEST CREATE error:", error);
  }
};

// Get all tests (Filtered by batch for students, all for admin)
export const getTests = async (req, res) => {
  try {
    // If student, maybe filter by batch. For now return all.
    const tests = await SpotTest.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      tests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tests",
      error: error.message
    });
  }
};

// Get a single test by ID
export const getTestById = async (req, res) => {
  try {
    const test = await SpotTest.findById(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }
    res.status(200).json({
      success: true,
      test
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching test",
      error: error.message
    });
  }
};

// Submit a test (Student only)
export const submitTest = async (req, res) => {
  try {
    const { testId, answers } = req.body;
    const test = await SpotTest.findById(testId);
    
    if (!test) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    let score = 0;
    let totalMarks = 0;
    const detailedAnswers = [];

    // Calculate score
    test.questions.forEach((q, index) => {
      totalMarks += q.marks;
      const studentAnswer = answers.find(a => a.questionIndex === index);
      const isCorrect = studentAnswer && studentAnswer.selectedOption === q.correctOption;
      
      if (isCorrect) {
        score += q.marks;
      }

      detailedAnswers.push({
        questionId: q._id,
        selectedOption: studentAnswer ? studentAnswer.selectedOption : null,
        isCorrect
      });
    });

    const submission = await Submission.create({
      student: req.user.id,
      test: testId,
      answers: detailedAnswers,
      score,
      totalMarks
    });

    res.status(201).json({
      success: true,
      message: "Test submitted successfully",
      score,
      totalMarks,
      submissionId: submission._id
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error submitting test",
      error: error.message
    });
  }
};
