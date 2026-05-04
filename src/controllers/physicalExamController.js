import PhysicalExam from '../models/PhysicalExam.js';
import PhysicalResult from '../models/PhysicalResult.js';
import { getTransporter } from '../config/nodemailer.js';

// Create a new physical exam record
export const createPhysicalExam = async (req, res) => {
  try {
    const { title, date, batch, totalMarks } = req.body;
    const newExam = await PhysicalExam.create({
      title,
      date,
      batch,
      totalMarks,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, exam: newExam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all physical exam records
export const getPhysicalExams = async (req, res) => {
  try {
    const exams = await PhysicalExam.find().sort({ date: -1 });
    res.status(200).json({ success: true, exams });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a physical exam
export const updatePhysicalExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, batch, totalMarks } = req.body;
    const exam = await PhysicalExam.findByIdAndUpdate(
      id,
      { title, date, batch, totalMarks },
      { new: true }
    );
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.status(200).json({ success: true, exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a physical exam and all its results
export const deletePhysicalExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await PhysicalExam.findById(id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    // Delete all results associated with this exam
    await PhysicalResult.deleteMany({ exam: id });
    await PhysicalExam.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "Exam and all associated results deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload results for a physical exam
export const uploadPhysicalResults = async (req, res) => {
  try {
    const { examId, results } = req.body; // results: [{ studentId, score }]

    if (!examId || !results || !Array.isArray(results)) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const savedResults = await Promise.all(results.map(async (item) => {
      return await PhysicalResult.findOneAndUpdate(
        { student: item.studentId, exam: examId },
        { score: Number(item.score) },
        { upsert: true, new: true }
      );
    }));

    res.status(200).json({
      success: true,
      message: `${savedResults.length} results saved successfully`,
      count: savedResults.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get results for specific exam
export const getPhysicalExamResults = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await PhysicalResult.find({ exam: id }).populate('student', 'name indexNumber');
    res.status(200).json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get results for specific exam (Student side - filtered by batch)
export const getBatchResultsForStudent = async (req, res) => {
  try {
    const { id } = req.params; // exam ID
    const studentBatch = req.user.batch;

    const exam = await PhysicalExam.findById(id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    // Check if exam is for student's batch or 'all'
    if (!exam.batch.includes(studentBatch) && !exam.batch.includes('all')) {
      return res.status(403).json({ success: false, message: "Results not available for your batch" });
    }

    const results = await PhysicalResult.find({ exam: id })
      .populate({
        path: 'student',
        select: 'name indexNumber batch',
        match: { batch: studentBatch } // Only match students from the current student's batch
      })
      .sort({ score: -1 }); // Rank by score

    // Filter out null students (those not in the current student's batch)
    const filteredResults = results.filter(res => res.student);

    res.status(200).json({ success: true, results: filteredResults });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a student's own history of physical exam results
export const getMyPhysicalResults = async (req, res) => {
  try {
    let studentId = req.user.id;

    // Admin can request history for any student
    if (req.user.role === 'instructor' && req.query.studentId) {
      studentId = req.query.studentId;
    }

    const results = await PhysicalResult.find({ student: studentId })
      .populate('exam', 'title date totalMarks')
      .sort({ 'exam.date': -1 });

    // Sort manually if populate sort didn't work as expected
    const sortedResults = results.sort((a, b) => new Date(b.exam?.date) - new Date(a.exam?.date));

    res.status(200).json({ success: true, results: sortedResults });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send email notification to students
export const notifyExamResults = async (req, res) => {
  try {
    const { id } = req.params;
    const { batch } = req.body; // New: optional batch filter

    const exam = await PhysicalExam.findById(id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    // Build the query for results
    const query = { exam: id };

    // We'll populate student and then filter if batch is specified
    const results = await PhysicalResult.find(query).populate('student', 'name email batch');

    let filteredResults = results;
    if (batch && batch !== "All Batches") {
      filteredResults = results.filter(r => r.student && r.student.batch === batch);
    }

    if (!filteredResults.length) {
      return res.status(400).json({ success: false, message: "No results found for the selected criteria to notify." });
    }

    // Use common transporter config
    const transporter = await getTransporter();

    let sentCount = 0;
    for (const result of filteredResults) {
      if (result.student && result.student.email) {
        const mailOptions = {
          from: `"ChemBridge" <${process.env.GMAIL_USER || 'support@chembridge.app'}>`,
          to: result.student.email,
          subject: `Exam Results Out: ChemBridge`,
          text: `Hello ${result.student.name},\n\nYour results for "${exam.title}" are out now.\n\nYou can log in to the website and view your detailed rank.\n\nBest regards,\nChemBridge Team`
        };
        try {
          await transporter.sendMail(mailOptions);
          sentCount++;
          // Optional: small delay to prevent SMTP throttling
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Failed to send email to ${result.student.email}:`, err);
        }
      }
    }

    res.status(200).json({ success: true, message: `Notification emails sent to ${sentCount} students.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

