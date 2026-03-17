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

// ---- ROOT ----
app.get("/", (req, res) => {
  res.send("Cycling API running");
});

// ---- FITNESS ----
app.get("/fitness", async (req, res) => {
  try {
    const url = `/athlete/${process.env.ATHLETE_ID}/fitness`;
    console.log("Calling Intervals API:", url);

    const response = await api.get(url);

    console.log("Intervals response:", response.data);

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
    console.error("Intervals error:", error.response?.data || error.message);

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
