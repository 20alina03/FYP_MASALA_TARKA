jest.mock('../../config/mongodb', () => jest.fn());

jest.mock('../../services/sentimentService', () => ({
  analyzeReview: jest.fn().mockResolvedValue({
    sentiment: 'neutral',
    sentiment_score: 0.5,
    sentiment_confidence: 80,
    ai_analyzed: true,
  }),
}));
