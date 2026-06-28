import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import StudyPlan from '../models/StudyPlan';
import { generateWithoutContext } from '../services/ai/groq.service';
import Quiz from '../models/Quiz';

const STUDY_PLANNER_SYSTEM_PROMPT = `You are an expert academic study planner and learning coach.
Your job is to create detailed, realistic, and motivating study schedules for students.
Always output a valid JSON object with the exact schema requested. No extra text outside the JSON.`;

export const generateStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const { examDate, subjects, dailyHours, preferredTime } = req.body;

    if (!examDate || !subjects?.length || !dailyHours) {
      res.status(400).json({ success: false, message: 'examDate, subjects, and dailyHours are required.' });
      return;
    }

    const today = new Date();
    const exam = new Date(examDate);
    const daysLeft = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    // Fetch student quiz performance for weak topics context
    let quizContext = '';
    try {
      const quizzes = await Quiz.find({ student: studentId })
        .select('title topic subject')
        .limit(10);
      if (quizzes.length) {
        quizContext = `\nStudent's recent quiz topics:\n${quizzes.map(q => `- ${q.title}${q.topic ? ` (${q.topic})` : ''}`).join('\n')}`;
      }
    } catch (_) {}

    const userPrompt = `Create a study plan for a student with the following requirements:
- Exam date: ${examDate} (${daysLeft} days away)
- Subjects to study: ${subjects.join(', ')}
- Daily available study hours: ${dailyHours} hours
- Preferred study time: ${preferredTime}
${quizContext}

Generate a JSON object with exactly this structure:
{
  "generatedPlan": [
    {
      "date": "YYYY-MM-DD",
      "dayLabel": "Monday",
      "topics": [
        { "subject": "...", "topic": "...", "durationMinutes": 60, "notes": "..." }
      ],
      "totalHours": 2
    }
  ],
  "weeklyGoals": ["Goal 1", "Goal 2"],
  "examTips": ["Tip 1", "Tip 2", "Tip 3"]
}

Generate ${Math.min(daysLeft, 14)} days of schedule starting from today.
Distribute subjects evenly. Include revision days before exam.`;

    const response = await generateWithoutContext(
      [{ role: 'user', content: userPrompt }],
      STUDY_PLANNER_SYSTEM_PROMPT,
      0.4,
      true
    );

    let parsed;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      res.status(500).json({ success: false, message: 'AI response parse error. Please try again.' });
      return;
    }

    // Save plan to database
    const plan = await StudyPlan.create({
      student: studentId,
      examDate: new Date(examDate),
      subjects,
      dailyHours,
      preferredTime,
      generatedPlan: parsed.generatedPlan || [],
      weeklyGoals: parsed.weeklyGoals || [],
      examTips: parsed.examTips || [],
    });

    res.status(201).json({ success: true, data: plan });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyPlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!._id;
    const plans = await StudyPlan.find({ student: studentId }).sort({ createdAt: -1 }).limit(10);
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user!._id;

    const plan = await StudyPlan.findById(id);
    if (!plan || plan.student.toString() !== studentId.toString()) {
      res.status(404).json({ success: false, message: 'Plan not found or access denied.' });
      return;
    }
    await plan.deleteOne();
    res.json({ success: true, message: 'Plan deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
