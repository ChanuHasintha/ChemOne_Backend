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

// Get all tests (with submission status)
export const getTests = async (req, res) => {
  try {
    // Filtering by batch if the user is a student
    let query = {};
    if (req.user.role === 'student') {
      // Student only sees tests for their batch or 'all' AND are published
      query = { 
        batch: { $in: [req.user.batch, 'all'] },
        isPublished: true
      };
    }

    const tests = await SpotTest.find(query).sort({ createdAt: -1 }).lean();
    
    const submissions = await Submission.find({ student: req.user.id });
    
    const testsWithStatus = tests.map(test => {
      const submission = submissions.find(s => s.test.toString() === test._id.toString());
      return {
        ...test,
        isSubmitted: !!submission,
        score: submission ? submission.score : null,
        totalMarks: submission ? submission.totalMarks : null
      };
    });

    res.status(200).json({
      success: true,
      tests: testsWithStatus
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

    // If student, check if published
    if (req.user.role === 'student' && !test.isPublished) {
      return res.status(403).json({ success: false, message: "This test is not yet published" });
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

    // Check if already submitted
    const existingSubmission = await Submission.findOne({ 
      student: req.user.id, 
      test: testId 
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: "You have already submitted this test. Re-attempts are not allowed." 
      });
    }

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

// Update a Test (Admin only)
export const updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, duration, batch, questions } = req.body;

    const updatedTest = await SpotTest.findByIdAndUpdate(
      id,
      { title, description, duration, batch, questions },
      { new: true, runValidators: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      message: "Test updated successfully",
      test: updatedTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating spot test",
      error: error.message
    });
  }
};

// Delete a Test (Admin only)
export const deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTest = await SpotTest.findByIdAndDelete(id);

    if (!deletedTest) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      message: "Test deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting spot test",
      error: error.message
    });
  }
};
// Publish/Unpublish a Test (Admin only)
export const togglePublishTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const updatedTest = await SpotTest.findByIdAndUpdate(
      id,
      { isPublished },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      message: `Test ${isPublished ? 'published' : 'unpublished'} successfully`,
      test: updatedTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling test status",
      error: error.message
    });
  }
};
