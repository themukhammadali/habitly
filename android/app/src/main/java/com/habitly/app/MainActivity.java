package com.habitly.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.habitly.app.widget.HabitlyWidgetPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(HabitlyWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
