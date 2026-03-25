import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "all");
  res.setHeader("User-Agent", "allow");
  next();
});
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- AXIOS CLIENT ----
const api = axios.create({
  baseURL: "https://intervals.icu/api/v1",
  auth: {
    username: "API_KEY",
    password: process.env.INTERVALS_API_KEY
  }
});

const ATHLETE = process.env.ATHLETE_ID;

// ---- ROBOTS.TXT ----
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nAllow: /\nDisallow:");
});

// ---- ROOT ----
app.get("/", (req, res) => {
  res.send("Cycling API running");
});

// ================================================================
// ATHLETE DATA & PROFILE
// ================================================================

app.get("/athlete/profile", async (req, res) => {
  try {
    const response = await api.get(`/athlete/${ATHLETE}/profile`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile", details: error.response?.data || error.message });
  }
});

app.get("/athlete/zones", async (req, res) => {
  try {
    const response = await api.get(`/athlete/${ATHLETE}/sport-settings`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch zones", details: error.response?.data || error.message });
  }
});

// ================================================================
// ACTIVITIES & WORKOUTS
// ================================================================

app.get("/fitness", async (req, res) => {
  try {
    const response = await api.get(`/athlete/${ATHLETE}/activities?oldest=2025-01-01`);
    const activities = response.data;

    if (!activities || activities.length === 0) {
      return res.status(404).json({ error: "No activity data found" });
    }

    const recent = activities.slice(0, 7);
    const avgTSS = recent.reduce((sum, a) => sum + (a.icu_training_load || 0), 0) / recent.length;
    const avgPower = recent.reduce((sum, a) => sum + (a.icu_average_watts || 0), 0) / recent.length;
    const totalTime = recent.reduce((sum, a) => sum + (a.moving_time || 0), 0);
    const latest = recent[0];
    const ctl = latest.icu_ctl;
    const atl = latest.icu_atl;
    const tsb = ctl - atl;

    res.json({
      recent_rides: recent.length,
      avg_tss: Math.round(avgTSS),
      avg_power: Math.round(avgPower),
      total_time_seconds: totalTime,
      last_ride: latest.start_date_local,
      ctl: Math.round(ctl),
      atl: Math.round(atl),
      tsb: Math.round(tsb),
      ftp: latest.icu_ftp,
      weighted_power: latest.icu_weighted_avg_watts,
      avg_hr: latest.average_heartrate,
      max_hr: latest.max_heartrate,
      resting_hr: latest.icu_resting_hr,
      efficiency_factor: latest.icu_efficiency_factor,
      decoupling: latest.decoupling,
      power_hr_ratio: latest.icu_power_hr,
      ride_time: latest.moving_time,
      distance: latest.distance
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fitness data", details: error.response?.data || error.message });
  }
});

app.get("/workouts", async (req, res) => {
  try {
    const oldest = req.query.oldest || "2025-01-01";
    const limit = parseInt(req.query.limit) || 10;

    const response = await api.get(`/athlete/${ATHLETE}/activities?oldest=${oldest}`);
    const data = response.data;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No workout data found" });
    }

    const formatted = data.slice(0, limit).map(w => ({
      id: w.id,
      date: w.start_date_local,
      name: w.name,
      type: w.type,
      duration: w.moving_time,
      distance: w.distance,
      avg_power: w.average_watts,
      normalized_power: w.weighted_average_watts,
      max_power: w.max_watts,
      avg_hr: w.average_heartrate,
      max_hr: w.max_heartrate,
      tss: w.training_stress_score,
      ctl: w.icu_ctl,
      atl: w.icu_atl,
      elevation: w.total_elevation_gain
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch workouts", details: error.response?.data || error.message });
  }
});

app.get("/activity/:id", async (req, res) => {
  try {
    const response = await api.get(`/activity/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity", details: error.response?.data || error.message });
  }
});
// ---- ACTIVITY INTERVALS ----
app.get("/activity/:id/intervals", async (req, res) => {
  try {
    const response = await api.get(`/activity/${req.params.id}/intervals`);
    const data = response.data;

    const workIntervals = data.icu_intervals
      .filter(i => i.type === "WORK")
      .map((i, idx) => ({
        interval_number: idx + 1,
        duration_secs: i.moving_time,
        avg_power: Math.round(i.average_watts),
        weighted_power: Math.round(i.weighted_average_watts),
        max_power: Math.round(i.max_watts),
        avg_hr: Math.round(i.average_heartrate),
        max_hr: Math.round(i.max_heartrate),
        avg_cadence: Math.round(i.average_cadence),
        zone: i.zone,
        intensity: i.intensity,
        decoupling: i.decoupling,
        wbal_start: i.wbal_start,
        wbal_end: i.wbal_end,
        joules_above_ftp: i.joules_above_ftp,
        group_id: i.group_id
      }));

    const groups = data.icu_groups.map(g => ({
      id: g.id,
      count: g.count,
      avg_power: Math.round(g.average_watts),
      avg_hr: Math.round(g.average_heartrate),
      max_hr: Math.round(g.max_heartrate),
      zone: g.zone
    }));

    res.json({
      activity_id: req.params.id,
      work_intervals: workIntervals,
      interval_groups: groups,
      total_work_intervals: workIntervals.length
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to fetch intervals", details: error.response?.data || error.message });
  }
});
// ================================================================
// WELLNESS & HEALTH METRICS
// ================================================================

app.get("/wellness", async (req, res) => {
  try {
    const oldest = req.query.oldest || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const response = await api.get(`/athlete/${ATHLETE}/wellness?oldest=${oldest}`);
    const data = response.data;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No wellness data found" });
    }

    const formatted = data.map(w => ({
      date: w.id,
      weight: w.weight,
      resting_hr: w.restingHR,
      hrv: w.hrv,
      hrv_score: w.hrvScore,
      sleep_score: w.sleepScore,
      sleep_secs: w.sleepSecs,
      ctl: w.ctl,
      atl: w.atl,
      tsb: w.tsb,
      mood: w.mood,
      motivation: w.motivation,
      fatigue: w.fatigue,
      soreness: w.soreness
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch wellness data", details: error.response?.data || error.message });
  }
});

// ================================================================
// TRAINING PLANS & EVENTS
// ================================================================

app.get("/events", async (req, res) => {
  try {
    const oldest = req.query.oldest || new Date().toISOString().split("T")[0];
    const newest = req.query.newest || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const response = await api.get(`/athlete/${ATHLETE}/events?oldest=${oldest}&newest=${newest}`);
    const data = response.data;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No events found" });
    }

    const formatted = data.map(e => ({
      id: e.id,
      date: e.start_date_local,
      name: e.name,
      type: e.type,
      category: e.category,
      description: e.description,
      planned_duration: e.moving_time,
      planned_load: e.load,
      indoor: e.indoor
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events", details: error.response?.data || error.message });
  }
});

// ---- START SERVER ----
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Routes available:`);
  console.log(`  GET /athlete/profile`);
  console.log(`  GET /athlete/zones`);
  console.log(`  GET /fitness`);
  console.log(`  GET /workouts?oldest=YYYY-MM-DD&limit=N`);
  console.log(`  GET /activity/:id`);
  console.log(`  GET /wellness?oldest=YYYY-MM-DD`);
  console.log(`  GET /events?oldest=YYYY-MM-DD&newest=YYYY-MM-DD`);
});