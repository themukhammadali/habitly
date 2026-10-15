package com.habitly.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

import com.habitly.app.MainActivity;
import com.habitly.app.R;

import java.util.Calendar;
import java.util.List;

/** The "Today" home screen widget: today's habits, tap one to check it off or add to it. */
public class HabitlyWidgetProvider extends AppWidgetProvider {
    static final String ACTION_TAP = "com.habitly.app.widget.TAP";
    static final String ACTION_MIDNIGHT = "com.habitly.app.widget.MIDNIGHT";
    static final String EXTRA_HABIT_ID = "habitId";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(ctx, id));
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
        scheduleMidnight(ctx);
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
        for (int id : ids) manager.updateAppWidget(id, build(ctx, id));
        manager.notifyAppWidgetViewDataChanged(ids, R.id.widget_list);
        scheduleMidnight(ctx);
    }

    private static RemoteViews build(Context ctx, int widgetId) {
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_habits);

        List<WidgetStore.Row> rows = WidgetStore.todayRows(ctx);
        int done = 0;
        for (WidgetStore.Row r : rows) if (r.satisfied()) done++;
        views.setTextViewText(R.id.widget_progress,
                rows.isEmpty() ? "" : done == rows.size() ? "All done" : done + " of " + rows.size());

        // The list: one row per habit, filled in by HabitlyWidgetService.
        Intent service = new Intent(ctx, HabitlyWidgetService.class);
        service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_list, service);
        views.setEmptyView(R.id.widget_list, R.id.widget_empty);

        // Rows tap through to here; each row adds its habit id.
        Intent tap = new Intent(ctx, HabitlyWidgetProvider.class).setAction(ACTION_TAP);
        int mutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
        views.setPendingIntentTemplate(R.id.widget_list,
                PendingIntent.getBroadcast(ctx, 0, tap, PendingIntent.FLAG_UPDATE_CURRENT | mutable));

        // The header and empty state open the app.
        PendingIntent open = PendingIntent.getActivity(ctx, 0,
                new Intent(ctx, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_header, open);
        views.setOnClickPendingIntent(R.id.widget_empty, open);
        return views;
    }

    /** Resets the widget for the new day, even if the app isn't opened. */
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
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
