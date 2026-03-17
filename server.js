app.get("/fitness", async (req, res) => {
  try {
    const response = await api.get(
      `/athlete/${process.env.ATHLETE_ID}/activities`
    );

    const activities = response.data;

    if (!activities || activities.length === 0) {
      return res.status(404).json({ error: "No activity data found" });
    }

    // Take last 7 rides
    const recent = activities.slice(0, 7);

    // Calculate simple metrics
    const avgTSS =
      recent.reduce((sum, a) => sum + (a.training_stress_score || 0), 0) /
      recent.length;

    const avgPower =
      recent.reduce((sum, a) => sum + (a.average_watts || 0), 0) /
      recent.length;

    res.json({
      recent_rides: recent.length,
      avg_tss: Math.round(avgTSS),
      avg_power: Math.round(avgPower),
      last_ride: recent[0].start_date_local
    });

  } catch (error) {
    console.error("Intervals error:", error.response?.data || error.message);

    res.status(500).json({
      error: "Failed to fetch fitness data",
      details: error.response?.data || error.message
    });
  }
});
