package com.habitly.app.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
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

    /** Asks the launcher to place the widget (Android 8+, launcher permitting). */
    @PluginMethod
    public void requestPin(PluginCall call) {
        JSObject result = new JSObject();
        boolean requested = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
            if (manager.isRequestPinAppWidgetSupported()) {
                requested = manager.requestPinAppWidget(
                        new ComponentName(getContext(), HabitlyWidgetProvider.class), null, null);
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
