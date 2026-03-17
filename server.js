import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

const api = axios.create({
  baseURL: "https://intervals.icu/api/v1",
  headers: {
    Authorization: `Bearer ${process.env.INTERVALS_API_KEY}`
  }
});

// ---- FITNESS ENDPOINT ----
app.get("/fitness", async (req, res) => {
  try {
    const response = await api.get(
      `/athlete/${process.env.ATHLETE_ID}/fitness`
    );

    const data = response.data;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No fitness data found" });
    }

    const latest = data[data.length - 1];

    res.json({
      ftp: latest.ftp,
      ctl: latest.ctl,
      atl: latest.atl,
      tsb: latest.tsb,
      vo2max: latest.vo2max
    });

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch fitness data",
      details: error.message
    });
  }
});

// ---- WORKOUTS ENDPOINT ----
app.get("/workouts", async (req, res) => {
  try {
    const response = await api.get(
      `/athlete/${process.env.ATHLETE_ID}/activities`
    );

    const workouts = response.data.slice(0, 5);

    const formatted = workouts.map(w => ({
      date: w.start_date_local,
      duration: w.moving_time,
      avg_power: w.average_watts,
      normalized_power: w.weighted_average_watts,
      tss: w.training_stress_score,
      type: w.type
    }));

    res.json(formatted);

  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch workouts",
      details: error.message
    });
  }
});

// ---- ROOT ----
app.get("/", (req, res) => {
  res.send("Cycling API running");
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
