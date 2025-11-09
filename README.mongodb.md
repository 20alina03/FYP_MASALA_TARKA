# MongoDB Local Setup Instructions

This project now supports both Supabase (cloud) and MongoDB (local) databases.

## Prerequisites

1. Install MongoDB Community Edition from: https://www.mongodb.com/try/download/community
2. Install MongoDB Compass (GUI) from: https://www.mongodb.com/try/download/compass
3. Make sure MongoDB is running on `localhost:27017`

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

The `.env.local` file has been created with MongoDB configuration:

```
MONGODB_URI=mongodb://localhost:27017/recipe-finder
JWT_SECRET=your-secret-key-change-this-in-production
PORT=5000
VITE_API_URL=http://localhost:5000/api
```

### 3. Start MongoDB Service

**Windows:**
```bash
net start MongoDB
```

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### 4. Start the Backend Server

```bash
node server/index.js
```

This will:
- Connect to MongoDB on `localhost:27017`
- Automatically create the database `recipe-finder`
- Automatically create all required collections:
  - users
  - profiles
  - recipes
  - generated_recipes
  - recipe_books
  - recipe_likes
  - recipe_comments
  - restaurants
  - user_roles

### 5. Start the Frontend Development Server

In a separate terminal:

```bash
npm run dev
```

### 6. Open MongoDB Compass

1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. You should see the `recipe-finder` database with all collections

## Using the Application

The application now works with MongoDB locally:

1. **Sign Up/Sign In**: Create a new account or log in
2. **Generate Recipes**: Use the AI recipe generator (still uses Supabase edge functions)
3. **Save Recipes**: Save recipes to your recipe book
4. **Share to Community**: Share recipes with the community
5. **Like & Comment**: Interact with community recipes

## Architecture

- **Frontend**: React + Vite (unchanged)
- **Backend**: Express.js server with MongoDB
- **Database**: MongoDB (local)
- **Authentication**: JWT tokens
- **AI Generation**: Still uses Supabase edge functions

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Login
- `GET /api/auth/session` - Get current user
- `POST /api/auth/signout` - Logout

### Recipes
- `GET /api/recipes` - Get all community recipes
- `POST /api/recipes` - Share recipe to community
- `PUT /api/recipes/:id` - Update recipe
- `DELETE /api/recipes/:id` - Delete recipe

### Generated Recipes
- `GET /api/generated_recipes` - Get user's generated recipes
- `POST /api/generated_recipes` - Save generated recipe
- `DELETE /api/generated_recipes/:id` - Delete generated recipe

### Recipe Book
- `GET /api/recipe_books` - Get user's recipe book
- `POST /api/recipe_books` - Add recipe to book
- `DELETE /api/recipe_books/:id` - Remove from book

### Likes & Comments
- `GET /api/recipe_likes` - Get likes for recipe
- `POST /api/recipe_likes` - Like/unlike recipe
- `GET /api/recipe_comments` - Get comments for recipe
- `POST /api/recipe_comments` - Add comment
- `PUT /api/recipe_comments/:id` - Update comment
- `DELETE /api/recipe_comments/:id` - Delete comment

## Troubleshooting

### MongoDB Connection Issues

1. Check if MongoDB is running:
   ```bash
   # Windows
   sc query MongoDB
   
   # macOS/Linux
   ps aux | grep mongod
   ```

2. Check MongoDB logs for errors

3. Ensure port 27017 is not blocked by firewall

### Server Not Starting

1. Check if port 5000 is available
2. Verify `.env.local` file exists and has correct values
3. Check server logs for errors

### Database Not Auto-Creating

1. The collections are created automatically when the server starts
2. Check server console for "Created collection: [name]" messages
3. Refresh MongoDB Compass to see the new collections

## Switching Between Supabase and MongoDB

The application is configured to use MongoDB by default when running locally. The Supabase configuration is kept for backward compatibility and for the AI generation feature which still uses Supabase edge functions.

To switch back to Supabase only, you can modify the database client imports in the frontend code.
