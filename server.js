import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// ---- AXIOS CLIENT (Intervals API) ----
const api = axios.create({
  baseURL: "https://intervals.icu/api/v1",
  auth: {
    username: "API_KEY", // REQUIRED literal string
    password: process.env.INTERVALS_API_KEY
  }
});

// ---- ROOT ----
app.get("/", (req, res) => {
  res.send("Cycling API running");
});

// ---- FITNESS (derived from activities) ----
app.get("/fitness", async (req, res) => {
  try {
    const response = await api.get(
      `/athlete/${process.env.ATHLETE_ID}/activities?oldest=2025-01-01`
    );

    const activities = response.data;

    if (!activities || activities.length === 0) {
      return res.status(404).json({ error: "No activity data found" });
    }

    const recent = activities.slice(0, 7);

    const avgTSS =
      recent.reduce((sum, a) => sum + (a.training_stress_score || 0), 0) /
      recent.length;

    const avgPower =
      recent.reduce((sum, a) => sum + (a.average_watts || 0), 0) /
      recent.length;

    const totalTime =
      recent.reduce((sum, a) => sum + (a.moving_time || 0), 0);

    res.json({
      recent_rides: recent.length,
      avg_tss: Math.round(avgTSS),
      avg_power: Math.round(avgPower),
      total_time_seconds: totalTime,
      last_ride: recent[0]?.start_date_local || null
    });

  } catch (error) {
    console.error("Fitness error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch fitness data",
      details: error.response?.data || error.message
    });
  }
});

// ---- WORKOUTS ----
app.get("/workouts", async (req, res) => {
  try {
    const response = await api.get(
      `/athlete/${process.env.ATHLETE_ID}/activities?oldest=2025-01-01`
    );

    const data = response.data;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No workout data found" });
    }

    const workouts = data.slice(0, 5);

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
    console.error("Workout error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch workouts",
      details: error.response?.data || error.message
    });
  }
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
