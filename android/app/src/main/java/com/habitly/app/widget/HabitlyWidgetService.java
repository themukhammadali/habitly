package com.habitly.app.widget;

import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import com.habitly.app.R;

import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.List;

/** Supplies the widget's list rows. */
public class HabitlyWidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    private static final class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private List<WidgetStore.Row> rows = new ArrayList<>();
        private final DecimalFormat amountFormat = new DecimalFormat("0.##");

        Factory(Context ctx) {
            this.ctx = ctx;
        }

        @Override
        public void onCreate() {}

        @Override
        public void onDataSetChanged() {
            rows = WidgetStore.todayRows(ctx);
        }

        @Override
        public void onDestroy() {}

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_row);
            if (position >= rows.size()) return v;
            WidgetStore.Row r = rows.get(position);

            v.setImageViewBitmap(R.id.row_icon, WidgetGraphics.iconTile(ctx, r.icon, r.color));
            v.setTextViewText(R.id.row_name, r.name);
            String sub = subtitle(r);
            v.setTextViewText(R.id.row_sub, sub);
            v.setViewVisibility(R.id.row_sub, sub.isEmpty() ? View.GONE : View.VISIBLE);
            v.setImageViewBitmap(R.id.row_action, WidgetGraphics.actionButton(ctx, r));
            v.setContentDescription(R.id.row_action, r.measurable()
                    ? "Add " + amountFormat.format(r.step) + " " + r.unit + " to " + r.name
                    : (r.done ? "Mark " + r.name + " not done" : "Mark " + r.name + " done"));

            // The whole row is the tap target.
            Intent fill = new Intent().putExtra(HabitlyWidgetProvider.EXTRA_HABIT_ID, r.id);
            v.setOnClickFillInIntent(R.id.row_root, fill);
            return v;
        }

        private String subtitle(WidgetStore.Row r) {
            if (r.measurable()) {
                return (amountFormat.format(r.amount) + "/" + amountFormat.format(r.target) + " " + r.unit).trim();
            }
            if (r.weeklyTimes > 0) return Math.min(r.weeklyDone, r.weeklyTimes) + "/" + r.weeklyTimes + " this week";
            return "";
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return 1;
        }

        @Override
        public long getItemId(int position) {
            return position < rows.size() ? rows.get(position).id.hashCode() : position;
        }

        @Override
        public boolean hasStableIds() {
            return true;
        }
    }
}
