import PhysicalExam from '../models/PhysicalExam.js';
import PhysicalResult from '../models/PhysicalResult.js';
import nodemailer from 'nodemailer';

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

// Send email notification to students
export const notifyExamResults = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await PhysicalExam.findById(id);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    const results = await PhysicalResult.find({ exam: id }).populate('student', 'name email');
    if (!results.length) {
      return res.status(400).json({ success: false, message: "No results found to notify. Please save results first." });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let sentCount = 0;
    await Promise.all(results.map(async (result) => {
      if (result.student && result.student.email) {
        const mailOptions = {
          from: `"ChemBridge" <${process.env.SMTP_USER}>`,
          to: result.student.email,
          subject: `Exam Results Out:ChemBridge`,
          text: `Hello ${result.student.name},\n\nYour exam results are out now. You can go to the website and view your results.\n\nBest regards,\nChemBridge Team`
        };
        try {
          await transporter.sendMail(mailOptions);
          sentCount++;
        } catch (err) {
          console.error(`Failed to send email to ${result.student.email}:`, err);
        }
      }
    }));

    res.status(200).json({ success: true, message: `Notification emails sent to ${sentCount} students.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

