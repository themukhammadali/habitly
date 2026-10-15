package com.habitly.app.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.ref.WeakReference;

/** Lets the app update the widget and collect taps made on it (see src/lib/widget.ts). */
@CapacitorPlugin(name = "HabitlyWidget")
public class HabitlyWidgetPlugin extends Plugin {
    private static WeakReference<HabitlyWidgetPlugin> instance = new WeakReference<>(null);

    @Override
    public void load() {
        instance = new WeakReference<>(this);
    }

    /** Called by the widget after a tap, so an open app applies it right away. */
    static void notifyApp() {
        HabitlyWidgetPlugin plugin = instance.get();
        if (plugin != null) plugin.notifyListeners("widgetAction", new JSObject());
    }

    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("Missing snapshot");
            return;
        }
        WidgetStore.saveSnapshot(getContext(), snapshot);
        HabitlyWidgetProvider.refreshAll(getContext());
        call.resolve();
    }

    /**
     * Asks the launcher to place a widget for a habit (Android 8+, launcher
     * permitting). Once placed, the provider learns its id and assigns the habit.
     */
    @PluginMethod
    public void requestPin(PluginCall call) {
        String habitId = call.getString("habitId");
        JSObject result = new JSObject();
        boolean requested = false;
        if (habitId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            if (manager.isRequestPinAppWidgetSupported()) {
                Intent placed = new Intent(getContext(), HabitlyWidgetProvider.class)
                        .setAction(HabitlyWidgetProvider.ACTION_PINNED)
                        .putExtra(HabitlyWidgetProvider.EXTRA_HABIT_ID, habitId);
                // Mutable: the launcher adds the new widget's id to this intent.
                int mutable = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0;
                PendingIntent callback = PendingIntent.getBroadcast(getContext(), habitId.hashCode(), placed,
                        PendingIntent.FLAG_UPDATE_CURRENT | mutable);
                requested = manager.requestPinAppWidget(
                        new ComponentName(getContext(), HabitlyWidgetProvider.class), null, callback);
            }
        }
        result.put("requested", requested);
        call.resolve(result);
    }

    @PluginMethod
    public void takePendingActions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("actions", WidgetStore.takePending(getContext()));
        call.resolve(result);
    }
}
