// Detect if running in development or production
const isDev = import.meta.env.MODE === 'development';

// On Railway: same domain
// On localhost: separate backend
const API_BASE_URL = isDev 
  ? 'http://localhost:5000/api'
  : '/api';

export default API_BASE_URL;
