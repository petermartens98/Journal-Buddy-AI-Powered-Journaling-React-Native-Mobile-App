# 📘 AI Journal — React Native + Supabase App

A simple journaling app built with **React Native (Expo)** and **Supabase**.  
Users can **sign up, log in, and create journal entries**, which are securely stored and retrieved from Supabase.  
The project also supports **chat history storage** for AI conversations or journaling insights.

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

## ⚛️ React Native Setup Guide

## 🌀 Clone the Repository
```bash
git clone <YOUR_REPO_LINK>
cd AiJournalApp
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
DE
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

Your React Native + Expo app is ready to launch! 🎉
"""

```
```
