const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/nlu", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_NLU_URL}/v1/analyze?version=2022-04-07`,
      req.body,
      {
        auth: { username: "apikey", password: process.env.REACT_APP_NLU_API_KEY },
        headers: { "Content-Type": "application/json" },
      }
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    const response = await axios.post(
      `${process.env.REACT_APP_TTS_URL}/v1/synthesize?voice=${voice}`,
      { text },
      {
        auth: { username: "apikey", password: process.env.REACT_APP_TTS_API_KEY },
        headers: { "Content-Type": "application/json", Accept: "audio/mp3" },
        responseType: "arraybuffer",
      }
    );
    res.set("Content-Type", "audio/mp3");
    res.send(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Proxy running on http://localhost:5000"));