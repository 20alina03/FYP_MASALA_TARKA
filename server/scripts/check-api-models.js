const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyBtQy-olVcQcAoG6JydtfaChh-nGVIXrbM');

async function checkModels() {
  try {
    console.log('Checking available models...\n');
    
    const models = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hello');
        console.log(`✅ ${modelName} - WORKS`);
      } catch (error) {
        console.log(`❌ ${modelName} - ${error.message.split('\n')[0]}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkModels();