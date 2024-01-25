import dotenv from "dotenv";
import express from "express";
import { StreamChat } from "stream-chat";
import { genSaltSync, hashSync } from "bcrypt";

dotenv.config();

const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env;
const client = StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

const app = express();
app.use(express.json());
const salt = genSaltSync(10);

interface User {
  id: string;
  email: string;
  hashed_password: string;
}

const USERS: User[] = [];

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Please provide email and password" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  const existingUsers = USERS.find((user) => user.email === email);
  if (existingUsers) {
    return res.status(400).json({ error: "User already exists" });
  }

  try {
    const hashed_password = hashSync(password, salt);
    const id = Math.random().toString(32).slice(2);
    const user: User = {
      id,
      email,
      hashed_password,
    };

    USERS.push(user);

    await client.upsertUser({
      id,
      email,
      name: email,
    });

    const token = client.createToken(id);

    return res.status(200).json({
      token,
      user: {
        id,
        email,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: "User already exists",
    });
  }
});

app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }

    const user = USERS.find((user) => user.email === email);
    if (!user) {
      return res.status(400).json({ error: "User does not exist" });
    }

    const validPassword = user.hashed_password === hashSync(password, salt);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = client.createToken(user.id);

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (e) {
    res.status(500).json({
      error: "Something went wrong",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening to you bro from ass ${PORT}...`);
});
