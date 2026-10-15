package com.habitly.app.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * The widget's copy of today's habits, written by the app (see src/lib/widget.ts),
 * plus the queue of taps made on the widget that the app still has to apply.
 * The app stays the source of truth: it replaces the snapshot after applying taps.
 */
final class WidgetStore {
    private static final String PREFS = "habitly_widget";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final String KEY_PENDING = "pending";

    /** One habit as the widget shows it today. */
    static final class Row {
        String id;
        String name;
        int color;
        String icon;
        boolean done;
        /** Weekly goals: target and how many are done this week, or times == 0. */
        int weeklyTimes;
        int weeklyDone;
        /** Measurable habits: goal (0 when not measurable), unit, step and today's amount. */
        double target;
        String unit = "";
        double step;
        double amount;

        boolean measurable() {
            return target > 0;
        }

        /** Done for today, or nothing more expected this week. */
        boolean satisfied() {
            return done || (weeklyTimes > 0 && weeklyDone >= weeklyTimes);
        }
    }

    private WidgetStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void saveSnapshot(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY_SNAPSHOT, json).apply();
    }

    /** Today's habits that are due, rolled over to today if the snapshot is from an earlier day. */
    static synchronized List<Row> todayRows(Context ctx) {
        List<Row> rows = new ArrayList<>();
        JSONObject snap = rolledSnapshot(ctx);
        if (snap == null) return rows;
        int weekday = weekday(Calendar.getInstance());
        JSONArray habits = snap.optJSONArray("habits");
        if (habits == null) return rows;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject h = habits.optJSONObject(i);
            if (h == null || !isDue(h, weekday)) continue;
            rows.add(toRow(h));
        }
        return rows;
    }

    /**
     * Applies a tap optimistically so the widget updates at once, and queues it
     * for the app. Returns false if the habit isn't in the snapshot.
     */
    static synchronized boolean applyTap(Context ctx, String habitId) {
        JSONObject snap = rolledSnapshot(ctx);
        if (snap == null) return false;
        JSONArray habits = snap.optJSONArray("habits");
        if (habits == null) return false;
        try {
            for (int i = 0; i < habits.length(); i++) {
                JSONObject h = habits.getJSONObject(i);
                if (!habitId.equals(h.optString("id"))) continue;
                JSONObject action = new JSONObject();
                action.put("habitId", habitId);
                action.put("day", snap.getString("date"));
                Calendar now = Calendar.getInstance();
                action.put("minutes", now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE));

                boolean wasDone = h.optBoolean("done");
                JSONObject goal = h.optJSONObject("goal");
                if (goal != null) {
                    double step = goal.optDouble("step", 1);
                    double amount = Math.round((goal.optDouble("amount", 0) + step) * 100) / 100.0;
                    goal.put("amount", amount);
                    h.put("done", amount >= goal.optDouble("target", 1));
                    action.put("type", "add");
                    action.put("delta", step);
                } else {
                    h.put("done", !wasDone);
                    action.put("type", "toggle");
                }
                JSONObject weekly = h.optJSONObject("weekly");
                boolean isDone = h.optBoolean("done");
                if (weekly != null && isDone != wasDone) {
                    weekly.put("done", Math.max(0, weekly.optInt("done") + (isDone ? 1 : -1)));
                }

                JSONArray pending = new JSONArray(prefs(ctx).getString(KEY_PENDING, "[]"));
                pending.put(action);
                prefs(ctx).edit()
                        .putString(KEY_SNAPSHOT, snap.toString())
                        .putString(KEY_PENDING, pending.toString())
                        .apply();
                return true;
            }
        } catch (JSONException e) {
            return false;
        }
        return false;
    }

    /** Returns queued taps as a JSON array and clears the queue. */
    static synchronized String takePending(Context ctx) {
        String pending = prefs(ctx).getString(KEY_PENDING, "[]");
        prefs(ctx).edit().remove(KEY_PENDING).apply();
        return pending;
    }

    /** The saved snapshot, reset for a new day (and week) if it was written earlier. */
    private static JSONObject rolledSnapshot(Context ctx) {
        String json = prefs(ctx).getString(KEY_SNAPSHOT, null);
        if (json == null) return null;
        try {
            JSONObject snap = new JSONObject(json);
            Calendar now = Calendar.getInstance();
            String today = dayKey(now);
            if (today.equals(snap.optString("date"))) return snap;

            String weekStart = dayKey(mondayOf(now));
            boolean newWeek = !weekStart.equals(snap.optString("weekStart"));
            JSONArray habits = snap.optJSONArray("habits");
            if (habits != null) {
                for (int i = 0; i < habits.length(); i++) {
                    JSONObject h = habits.getJSONObject(i);
                    h.put("done", false);
                    JSONObject goal = h.optJSONObject("goal");
                    if (goal != null) goal.put("amount", 0);
                    JSONObject weekly = h.optJSONObject("weekly");
                    if (weekly != null && newWeek) weekly.put("done", 0);
                }
            }
            snap.put("date", today);
            snap.put("weekStart", weekStart);
            return snap;
        } catch (JSONException e) {
            return null;
        }
    }

    private static boolean isDue(JSONObject h, int weekday) {
        JSONArray days = h.optJSONArray("days");
        if (days == null) return true;
        for (int i = 0; i < days.length(); i++) if (days.optInt(i, -1) == weekday) return true;
        return false;
    }

    private static Row toRow(JSONObject h) {
        Row r = new Row();
        r.id = h.optString("id");
        r.name = h.optString("name");
        r.icon = h.optString("icon");
        r.done = h.optBoolean("done");
        try {
            r.color = android.graphics.Color.parseColor(h.optString("color", "#2fb170"));
        } catch (IllegalArgumentException e) {
            r.color = 0xFF2FB170;
        }
        JSONObject weekly = h.optJSONObject("weekly");
        if (weekly != null) {
            r.weeklyTimes = weekly.optInt("times");
            r.weeklyDone = weekly.optInt("done");
        }
        JSONObject goal = h.optJSONObject("goal");
        if (goal != null) {
            r.target = goal.optDouble("target", 0);
            r.unit = goal.optString("unit", "");
            r.step = goal.optDouble("step", 1);
            r.amount = goal.optDouble("amount", 0);
        }
        return r;
    }

    /** 0 = Monday … 6 = Sunday, matching the app. */
    static int weekday(Calendar c) {
        return (c.get(Calendar.DAY_OF_WEEK) + 5) % 7;
    }

    static Calendar mondayOf(Calendar c) {
        Calendar m = (Calendar) c.clone();
        m.add(Calendar.DAY_OF_MONTH, -weekday(c));
        return m;
    }

    static String dayKey(Calendar c) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(c.getTimeZone());
        return f.format(c.getTime());
    }
}
