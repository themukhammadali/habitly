package com.habitly.app.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * The widget's copy of the habits, written by the app (see src/lib/widget.ts),
 * which habit each widget shows, and the queue of taps the app still has to
 * apply. The app stays the source of truth: it replaces the snapshot after
 * applying taps.
 */
final class WidgetStore {
    private static final String PREFS = "habitly_widget";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final String KEY_PENDING = "pending";
    private static final String KEY_WIDGET = "widget_";

    /** One habit as a widget shows it. */
    static final class Habit {
        String id;
        String name;
        int color;
        String icon;
        boolean done;
        /** Scheduled weekdays (0 = Monday), or null for every day. */
        int[] days;
        /** Weekly goals: target and how many are done this week, or times == 0. */
        int weeklyTimes;
        int weeklyDone;
        /** Measurable habits: goal (0 when not measurable), unit, step and today's amount. */
        double target;
        String unit = "";
        double step;
        double amount;
        /** One value per day, oldest first, ending today (see WidgetSnapshot in the app). */
        double[] history = new double[0];

        boolean measurable() {
            return target > 0;
        }

        boolean dueOn(int weekday) {
            if (days == null) return true;
            for (int d : days) if (d == weekday) return true;
            return false;
        }

        /**
         * Current streak in scheduled days, like the app's: an unfinished today
         * doesn't break it. Weekly goals return -1 (they show weekly progress instead).
         */
        int streak() {
            if (weeklyTimes > 0) return -1;
            Calendar day = Calendar.getInstance();
            int streak = 0;
            for (int i = history.length - 1; i >= 0; i--, day.add(Calendar.DAY_OF_MONTH, -1)) {
                double v = history[i];
                if (v < 0) break;
                if (!dueOn(weekday(day))) continue;
                if (v >= 1) streak++;
                else if (i != history.length - 1) break;
            }
            return streak;
        }
    }

    private WidgetStore() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void saveSnapshot(Context ctx, String json) {
        prefs(ctx).edit().putString(KEY_SNAPSHOT, json).apply();
    }

    /** All habits, for choosing what a widget shows. */
    static synchronized List<Habit> habits(Context ctx) {
        List<Habit> out = new ArrayList<>();
        JSONObject snap = rolledSnapshot(ctx);
        JSONArray habits = snap == null ? null : snap.optJSONArray("habits");
        if (habits == null) return out;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject h = habits.optJSONObject(i);
            if (h != null) out.add(toHabit(h));
        }
        return out;
    }

    /**
     * The app's palette colors for the widget, {background, tile}, for light or
     * dark mode; null before the app has sent any.
     */
    static synchronized int[] colors(Context ctx, boolean dark) {
        String json = prefs(ctx).getString(KEY_SNAPSHOT, null);
        if (json == null) return null;
        try {
            JSONObject mode = new JSONObject(json).getJSONObject("colors").getJSONObject(dark ? "dark" : "light");
            return new int[] {Color.parseColor(mode.getString("background")), Color.parseColor(mode.getString("tile"))};
        } catch (JSONException | IllegalArgumentException e) {
            return null;
        }
    }

    /** The habit a widget shows, or null if it was deleted or archived in the app. */
    static synchronized Habit habitFor(Context ctx, int widgetId) {
        String id = prefs(ctx).getString(KEY_WIDGET + widgetId, null);
        if (id == null) return null;
        for (Habit h : habits(ctx)) if (h.id.equals(id)) return h;
        return null;
    }

    static synchronized boolean isAssigned(Context ctx, int widgetId) {
        return prefs(ctx).contains(KEY_WIDGET + widgetId);
    }

    static synchronized void assign(Context ctx, int widgetId, String habitId) {
        prefs(ctx).edit().putString(KEY_WIDGET + widgetId, habitId).apply();
    }

    /** Points a widget at the habit after its current one, wrapping around. */
    static synchronized void showNext(Context ctx, int widgetId) {
        List<Habit> all = habits(ctx);
        if (all.isEmpty()) return;
        String current = prefs(ctx).getString(KEY_WIDGET + widgetId, null);
        int index = -1;
        for (int i = 0; i < all.size(); i++) if (all.get(i).id.equals(current)) index = i;
        assign(ctx, widgetId, all.get((index + 1) % all.size()).id);
    }

    static synchronized void forget(Context ctx, int widgetId) {
        prefs(ctx).edit().remove(KEY_WIDGET + widgetId).apply();
    }

    /**
     * Applies a tap optimistically so the widget updates at once, and queues it
     * for the app. Returns false if the habit isn't in the snapshot.
     */
    static synchronized boolean applyTap(Context ctx, String habitId) {
        JSONObject snap = rolledSnapshot(ctx);
        JSONArray habits = snap == null ? null : snap.optJSONArray("habits");
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
                double today;
                JSONObject goal = h.optJSONObject("goal");
                if (goal != null) {
                    double step = goal.optDouble("step", 1);
                    double target = goal.optDouble("target", 1);
                    double amount = Math.round((goal.optDouble("amount", 0) + step) * 100) / 100.0;
                    goal.put("amount", amount);
                    h.put("done", amount >= target);
                    today = amount >= target ? 1 : amount / target;
                    action.put("type", "add");
                    action.put("delta", step);
                } else {
                    h.put("done", !wasDone);
                    today = wasDone ? 0 : 1;
                    action.put("type", "toggle");
                }
                JSONArray history = h.optJSONArray("history");
                if (history != null && history.length() > 0) history.put(history.length() - 1, today);
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

    /**
     * The saved snapshot, moved forward to today if it was written on an
     * earlier day: today starts empty and the history shifts along.
     */
    private static JSONObject rolledSnapshot(Context ctx) {
        String json = prefs(ctx).getString(KEY_SNAPSHOT, null);
        if (json == null) return null;
        try {
            JSONObject snap = new JSONObject(json);
            Calendar now = Calendar.getInstance();
            String today = dayKey(now);
            int elapsed = daysBetween(snap.optString("date"), today);
            if (elapsed <= 0) return snap;

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
                    JSONArray history = h.optJSONArray("history");
                    if (history != null) h.put("history", shift(history, elapsed));
                }
            }
            snap.put("date", today);
            snap.put("weekStart", weekStart);
            return snap;
        } catch (JSONException e) {
            return null;
        }
    }

    /** Drops the oldest `days` values and appends that many empty days. */
    private static JSONArray shift(JSONArray history, int days) throws JSONException {
        JSONArray out = new JSONArray();
        int n = history.length();
        for (int i = Math.min(days, n); i < n; i++) out.put(history.get(i));
        while (out.length() < n) out.put(0);
        return out;
    }

    private static Habit toHabit(JSONObject h) {
        Habit r = new Habit();
        r.id = h.optString("id");
        r.name = h.optString("name");
        r.icon = h.optString("icon");
        r.done = h.optBoolean("done");
        try {
            r.color = Color.parseColor(h.optString("color", "#2fb170"));
        } catch (IllegalArgumentException e) {
            r.color = 0xFF2FB170;
        }
        JSONArray days = h.optJSONArray("days");
        if (days != null) {
            r.days = new int[days.length()];
            for (int i = 0; i < days.length(); i++) r.days[i] = days.optInt(i);
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
        JSONArray history = h.optJSONArray("history");
        if (history != null) {
            r.history = new double[history.length()];
            for (int i = 0; i < history.length(); i++) r.history[i] = history.optDouble(i, 0);
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

    private static int daysBetween(String from, String to) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        try {
            long a = f.parse(from).getTime();
            long b = f.parse(to).getTime();
            return (int) Math.round((b - a) / 86400000.0);
        } catch (ParseException | NullPointerException e) {
            return 0;
        }
    }
}
