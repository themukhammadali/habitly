package com.habitly.app.widget;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.core.content.res.ResourcesCompat;

import com.habitly.app.R;

import java.util.List;

/** Asks which habit a new widget should show (also used to change it later). */
public class WidgetConfigActivity extends Activity {
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // If the user backs out, the launcher removes a widget that was being added.
        setResult(RESULT_CANCELED);
        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish();
            return;
        }

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        list.setPadding(pad, pad, pad, dp(12));

        TextView title = new TextView(this);
        title.setText(R.string.widget_config_title);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setTextColor(getColor(R.color.widget_text));
        title.setTypeface(font(), Typeface.BOLD);
        title.setPadding(dp(4), 0, 0, dp(12));
        list.addView(title);

        List<WidgetStore.Habit> habits = WidgetStore.habits(this);
        if (habits.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText(R.string.widget_config_empty);
            empty.setTextColor(getColor(R.color.widget_text_secondary));
            empty.setPadding(dp(4), dp(8), dp(4), dp(16));
            list.addView(empty);
        }
        for (WidgetStore.Habit h : habits) list.addView(row(h));

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundResource(R.drawable.widget_background);
        scroll.addView(list);
        setContentView(scroll);
    }

    private View row(WidgetStore.Habit h) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(12), dp(10), dp(12), dp(10));
        row.setBackgroundResource(R.drawable.widget_tile_background);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(6);
        row.setLayoutParams(lp);

        ImageView icon = new ImageView(this);
        icon.setImageBitmap(WidgetGraphics.iconTile(this, h.icon, h.color));
        row.addView(icon, new LinearLayout.LayoutParams(dp(36), dp(36)));

        TextView name = new TextView(this);
        name.setText(h.name);
        name.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        name.setTextColor(getColor(R.color.widget_text));
        name.setTypeface(font());
        name.setPadding(dp(12), 0, 0, 0);
        row.addView(name);

        row.setOnClickListener(v -> choose(h.id));
        return row;
    }

    private void choose(String habitId) {
        WidgetStore.assign(this, widgetId, habitId);
        HabitlyWidgetProvider.refresh(this, widgetId);
        setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
        finish();
    }

    /** The app's font, Manrope; the system font if it can't load. */
    private Typeface font() {
        try {
            Typeface t = ResourcesCompat.getFont(this, R.font.manrope);
            return t != null ? t : Typeface.DEFAULT;
        } catch (RuntimeException e) {
            return Typeface.DEFAULT;
        }
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
