# 📘 AI Journal — React Native + Supabase Mobile App

- Journaling app built with **React Native (Expo)** and **Supabase**.  
- Users can **sign up, log in, and create journal entries**, which are securely stored and retrieved from Supabase.  
- User can also utilize AI Chat (deepseek-chat) to futher reflect and chat about their experience.

---
## Screenshots
### Login / Account Creation Screens
<img width="409" height="914" alt="image" src="https://github.com/user-attachments/assets/6aeba6e5-1950-47dd-8008-d83f9645feed" />
<img width="410" height="911" alt="image" src="https://github.com/user-attachments/assets/1759a6e4-a387-4600-b235-83bc4d49e3b1" />

### Home Screen
<img width="411" height="913" alt="image" src="https://github.com/user-attachments/assets/4417bfdb-8888-40c2-87b3-0beda13c2dc1" />

### Entries (History) Screen
<img width="410" height="913" alt="image" src="https://github.com/user-attachments/assets/e19d694d-304f-4a72-a1b1-e0061ee44878" />

### Add New Entry Screen
<img width="413" height="913" alt="image" src="https://github.com/user-attachments/assets/c29b6d3b-7b77-4d0f-a199-7dd0f059f7a9" />

### AI Chat Screen
<img width="410" height="905" alt="image" src="https://github.com/user-attachments/assets/d1a7b8ca-e0b5-47b3-b443-c1001d24375c" />

### Profile Screen
<img width="413" height="912" alt="image" src="https://github.com/user-attachments/assets/52cab761-d220-495f-bce7-7596846e009f" />

---

## 🚀 Features

- 🔐 **Authentication** using Supabase Auth  
- 📝 **Entries**: Create, view, update, and delete your personal journal entries  
- 💬 **Chat History**: Save and load chat sessions for each user  
- ⚙️ **Secure RLS (Row Level Security)** so users only access their own data  
- 🌈 Built with **React Native + Expo** for cross-platform mobile development  

---

## 🛠️ Tech Stack

- **Frontend:** React Native + Expo  
- **Backend:** Supabase (PostgreSQL + Auth + Storage)  
- **Language:** JavaScript / JSX  
- **Database:** PostgreSQL with SQL-based schema and security policies  

---

## 🧩 Supabase Setup

1. **Create a new project** at [Supabase.io](https://supabase.io)  
2. Go to the **SQL Editor** and paste the following schema:

```sql
-- === ENTRIES TABLE ===
CREATE TABLE entries (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment SMALLINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users NOT NULL
);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entries"
  ON entries FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own entries"
  ON entries FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE USING (auth.uid() = user_id);

-- === USERS TABLE ===
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  username TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- === CHAT HISTORY TABLE ===
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_user_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);

ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat history"
  ON chat_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat history"
  ON chat_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat history"
  ON chat_history FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat history"
  ON chat_history FOR DELETE USING (auth.uid() = user_id);
  ```
--- 

## ⚛️ React Native Setup Guide

## 🌀 Clone the Repository
```bash
git clone https://github.com/petermartens98/Journal-Buddy-AI-Powered-Journaling-React-Native-Mobile-App
cd Journal-Buddy-AI-Powered-Journaling-React-Native-Mobile-App
````

## 🚀 Initialize Expo Project

```bash
expo init AiJournalApp
```

## 🔐 Environment Variables

Create a `.env` file in the project root:

```bash
touch .env
```

Add your keys:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
DEEPSEEK_API_KEY=your-deepseek-api-key
```

## 📦 Install Dependencies

```bash
npm install
# or
yarn install
```

## ▶️ Run the Project

```bash
npx expo start
```

