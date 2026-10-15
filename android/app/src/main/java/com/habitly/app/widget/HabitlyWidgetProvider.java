package com.habitly.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.widget.RemoteViews;

import com.habitly.app.MainActivity;
import com.habitly.app.R;

import java.text.DecimalFormat;
import java.util.Calendar;

/**
 * A 3×2 home screen widget showing one habit like its card in the app: icon,
 * name, progress, the check / + button, and the dot heatmap.
 */
public class HabitlyWidgetProvider extends AppWidgetProvider {
    static final String ACTION_TAP = "com.habitly.app.widget.TAP";
    static final String ACTION_PINNED = "com.habitly.app.widget.PINNED";
    static final String ACTION_MIDNIGHT = "com.habitly.app.widget.MIDNIGHT";
    static final String ACTION_NEXT = "com.habitly.app.widget.NEXT";
    static final String EXTRA_HABIT_ID = "habitId";

    private static final DecimalFormat AMOUNT = new DecimalFormat("0.##");

    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(ctx, manager, id));
        scheduleMidnight(ctx);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager manager, int id, Bundle options) {
        // Size changed (or the launcher reported it): redraw the heatmap to fit.
        manager.updateAppWidget(id, build(ctx, manager, id));
    }

    @Override
    public void onDeleted(Context ctx, int[] ids) {
        for (int id : ids) WidgetStore.forget(ctx, id);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String action = intent.getAction();
        if (ACTION_TAP.equals(action)) {
            String habitId = intent.getStringExtra(EXTRA_HABIT_ID);
            if (habitId != null && WidgetStore.applyTap(ctx, habitId)) {
                refreshAll(ctx);
                HabitlyWidgetPlugin.notifyApp();
            }
        } else if (ACTION_PINNED.equals(action)) {
            // Placed from a habit's "Add to home screen" in the app.
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            String habitId = intent.getStringExtra(EXTRA_HABIT_ID);
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID && habitId != null) {
                WidgetStore.assign(ctx, id, habitId);
                AppWidgetManager.getInstance(ctx).updateAppWidget(id, build(ctx, AppWidgetManager.getInstance(ctx), id));
            }
        } else if (ACTION_NEXT.equals(action)) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id != AppWidgetManager.INVALID_APPWIDGET_ID) {
                WidgetStore.showNext(ctx, id);
                refresh(ctx, id);
            }
        } else if (ACTION_MIDNIGHT.equals(action)) {
            refreshAll(ctx);
        }
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager alarms = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(midnightIntent(ctx));
    }

    /** Redraws every Habitly widget on the home screen. */
    static void refreshAll(Context ctx) {
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        int[] ids = manager.getAppWidgetIds(new ComponentName(ctx, HabitlyWidgetProvider.class));
        if (ids.length == 0) return;
        for (int id : ids) manager.updateAppWidget(id, build(ctx, manager, id));
        scheduleMidnight(ctx);
    }

    static void refresh(Context ctx, int widgetId) {
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        manager.updateAppWidget(widgetId, build(ctx, manager, widgetId));
    }

    private static RemoteViews build(Context ctx, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_habit);
        // A widget placed without choosing (e.g. by the launcher) starts on the first habit.
        if (!WidgetStore.isAssigned(ctx, widgetId)) WidgetStore.showNext(ctx, widgetId);
        WidgetStore.Habit habit = WidgetStore.habitFor(ctx, widgetId);

        if (habit == null) {
            // No habits yet, or the habit was deleted or archived: tap to choose one.
            boolean assigned = WidgetStore.isAssigned(ctx, widgetId);
            views.setViewVisibility(R.id.widget_content, View.GONE);
            views.setViewVisibility(R.id.widget_message, View.VISIBLE);
            views.setTextViewText(R.id.widget_message, ctx.getString(
                    assigned ? R.string.widget_habit_missing : R.string.widget_choose_habit));
            Intent choose = new Intent(ctx, WidgetConfigActivity.class)
                    .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                    .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(ctx, widgetId, choose,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            return views;
        }

        views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        views.setViewVisibility(R.id.widget_message, View.GONE);
        views.setImageViewBitmap(R.id.widget_icon, WidgetGraphics.iconTile(ctx, habit.icon, habit.color));
        views.setTextViewText(R.id.widget_name, habit.name);
        String sub = subtitle(habit);
        views.setTextViewText(R.id.widget_sub, sub);
        views.setViewVisibility(R.id.widget_sub, sub.isEmpty() ? View.GONE : View.VISIBLE);

        boolean due = habit.weeklyTimes > 0 || habit.dueOn(WidgetStore.weekday(Calendar.getInstance()));
        views.setImageViewBitmap(R.id.widget_action, WidgetGraphics.actionButton(ctx, habit));
        views.setInt(R.id.widget_action, "setImageAlpha", due || habit.done ? 255 : 90);
        views.setContentDescription(R.id.widget_action, habit.measurable()
                ? "Add " + AMOUNT.format(habit.step) + " " + habit.unit + " to " + habit.name
                : (habit.done ? "Mark " + habit.name + " not done" : "Mark " + habit.name + " done"));

        int[] size = heatmapSize(ctx, manager, widgetId);
        views.setImageViewBitmap(R.id.widget_heatmap, WidgetGraphics.heatmap(ctx, habit, size[0], size[1]));

        Intent tap = new Intent(ctx, HabitlyWidgetProvider.class)
                .setAction(ACTION_TAP)
                .putExtra(EXTRA_HABIT_ID, habit.id);
        views.setOnClickPendingIntent(R.id.widget_action, PendingIntent.getBroadcast(ctx, widgetId, tap,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        // Small switch button: cycle to the next habit. Hidden when there's only one.
        boolean several = WidgetStore.habits(ctx).size() > 1;
        views.setViewVisibility(R.id.widget_switch, several ? View.VISIBLE : View.GONE);
        Intent next = new Intent(ctx, HabitlyWidgetProvider.class)
                .setAction(ACTION_NEXT)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        views.setOnClickPendingIntent(R.id.widget_switch, PendingIntent.getBroadcast(ctx, 100000 + widgetId, next,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        PendingIntent open = PendingIntent.getActivity(ctx, 0,
                new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, open);
        return views;
    }

    private static String subtitle(WidgetStore.Habit h) {
        if (h.measurable()) return (AMOUNT.format(h.amount) + "/" + AMOUNT.format(h.target) + " " + h.unit).trim();
        if (h.weeklyTimes > 0) return Math.min(h.weeklyDone, h.weeklyTimes) + "/" + h.weeklyTimes + " this week";
        int streak = h.streak();
        return streak > 0 ? streak + (streak == 1 ? " day streak" : " days streak") : "";
    }

    /**
     * Pixels left for the heatmap: the widget's size (portrait: min width, max
     * height) minus padding and the header row.
     */
    private static int[] heatmapSize(Context ctx, AppWidgetManager manager, int widgetId) {
        Bundle o = manager.getAppWidgetOptions(widgetId);
        int wDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
        int hDp = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        if (wDp <= 0) wDp = 250;
        if (hDp <= 0) hDp = 120;
        DisplayMetrics m = ctx.getResources().getDisplayMetrics();
        int padding = (8 + 14) * 2; // margin plus the card's padding
        int header = 40 + 10;
        return new int[] {
            Math.round((wDp - padding) * m.density),
            Math.round(Math.max(40, hDp - padding - header) * m.density),
        };
    }

    /** Moves the widget to the new day at midnight, even if the app isn't opened. */
    private static void scheduleMidnight(Context ctx) {
        AlarmManager alarms = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_MONTH, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        // Inexact is fine: a few minutes late at midnight doesn't matter, and needs no permission.
        alarms.set(AlarmManager.RTC, next.getTimeInMillis(), midnightIntent(ctx));
    }

    private static PendingIntent midnightIntent(Context ctx) {
        Intent i = new Intent(ctx, HabitlyWidgetProvider.class).setAction(ACTION_MIDNIGHT);
        return PendingIntent.getBroadcast(ctx, -1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
