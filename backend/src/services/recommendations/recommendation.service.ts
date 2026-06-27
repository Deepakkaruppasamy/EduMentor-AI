import mongoose from 'mongoose';
import Recommendation, { IRecommendation } from '../../models/Recommendation';
import Chat from '../../models/Chat';
import Quiz from '../../models/Quiz';
import { generateWithoutContext } from '../ai/groq.service';

/**
 * Update student topic tracking based on a new query
 */
export async function trackStudentQuery(
  studentId: string,
  courseId: string,
  query: string,
  retrievedTopics: string[]
): Promise<void> {
  let rec = await Recommendation.findOne({ student: studentId, course: courseId });

  if (!rec) {
    rec = new Recommendation({
      student: new mongoose.Types.ObjectId(studentId),
      course: new mongoose.Types.ObjectId(courseId),
      weakTopics: [],
      strongTopics: [],
      topicProgress: [],
      suggestedTopics: [],
      revisionPlan: '',
      personalizedQuizTopics: [],
    });
  }

  rec.totalQueries += 1;

  // Track topics from query
  for (const topic of retrievedTopics) {
    const existing = rec.topicProgress.find((t) => t.topic === topic);
    if (existing) {
      existing.queryCount += 1;
    } else {
      rec.topicProgress.push({ topic, queryCount: 1, avgScore: 0, strength: 'moderate' });
    }
  }

  rec.lastUpdated = new Date();
  await rec.save();
}

/**
 * Update student performance based on quiz results
 */
export async function updateQuizPerformance(
  studentId: string,
  courseId: string,
  topic: string,
  score: number,
  maxScore: number
): Promise<void> {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  let rec = await Recommendation.findOne({ student: studentId, course: courseId });
  if (!rec) return;

  const topicProg = rec.topicProgress.find((t) => t.topic === topic);
  if (topicProg) {
    topicProg.avgScore = (topicProg.avgScore + percentage) / 2;
    topicProg.strength = percentage >= 75 ? 'strong' : percentage >= 45 ? 'moderate' : 'weak';
  } else {
    rec.topicProgress.push({
      topic,
      queryCount: 1,
      avgScore: percentage,
      strength: percentage >= 75 ? 'strong' : percentage >= 45 ? 'moderate' : 'weak',
    });
  }

  // Update weak/strong topic lists
  const weakTopics = rec.topicProgress.filter((t) => t.strength === 'weak').map((t) => t.topic);
  const strongTopics = rec.topicProgress.filter((t) => t.strength === 'strong').map((t) => t.topic);
  rec.weakTopics = weakTopics;
  rec.strongTopics = strongTopics;

  // Update avg quiz score
  const allQuizzes = await Quiz.find({ student: studentId, course: courseId, status: 'completed' });
  const scores = allQuizzes.map((q) => (q.score || 0) / (q.maxScore || 1) * 100);
  rec.avgQuizScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  await rec.save();
}

/**
 * Generate personalized learning recommendations using LLM
 */
export async function generatePersonalizedPlan(
  studentId: string,
  courseId: string,
  courseName: string
): Promise<IRecommendation | null> {
  const rec = await Recommendation.findOne({ student: studentId, course: courseId });
  if (!rec) return null;

  const weakTopics = rec.weakTopics.join(', ') || 'None identified yet';
  const strongTopics = rec.strongTopics.join(', ') || 'None identified yet';
  const avgScore = rec.avgQuizScore.toFixed(1);

  const prompt = `A student in ${courseName} course has:
- Weak topics: ${weakTopics}
- Strong topics: ${strongTopics}  
- Average quiz score: ${avgScore}%
- Total queries: ${rec.totalQueries}

Generate a personalized 2-week revision plan and resource recommendation JSON:
{
  "revisionPlan": "Detailed weekly plan text...",
  "suggestedTopics": ["topic1", "topic2", "topic3"],
  "personalizedQuizTopics": ["quiz_topic1", "quiz_topic2"],
  "resourceRecommendations": [
    {
      "category": "YouTube Videos",
      "title": "Topic explanation video name",
      "description": "How this specific video helps clarify the weak topic",
      "link": "https://www.youtube.com/watch?v=example"
    }
  ]
}

In the "resourceRecommendations" array, please recommend exactly 4 or 5 highly relevant educational resources, covering different categories from:
- Lecture Slides (slides online)
- PDFs (reference notes/cheatsheets)
- Books (textbooks or chapters)
- YouTube Videos (video tutorials)
- Research Papers (original concept papers)

Return valid JSON matching the exact schema above.`;

  try {
    const response = await generateWithoutContext(
      [{ role: 'user', content: prompt }],
      'You are an educational advisor. Always respond with valid JSON only.',
      0.4
    );

    const match = response.content.match(/\{[\s\S]*\}/);
    if (match) {
      const plan = JSON.parse(match[0]);
      rec.revisionPlan = plan.revisionPlan || rec.revisionPlan;
      rec.suggestedTopics = plan.suggestedTopics || rec.suggestedTopics;
      rec.personalizedQuizTopics = plan.personalizedQuizTopics || rec.personalizedQuizTopics;
      rec.resourceRecommendations = plan.resourceRecommendations || [];
      rec.lastUpdated = new Date();
      await rec.save();
    }
  } catch (err) {
    console.error('Failed to generate personalized plan:', err);
  }

  return rec;
}

export async function getStudentRecommendations(studentId: string, courseId: string) {
  return Recommendation.findOne({ student: studentId, course: courseId });
}
