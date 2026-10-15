package com.habitly.app.widget;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;

import androidx.core.content.ContextCompat;
import androidx.core.graphics.drawable.DrawableCompat;

/**
 * Draws the widget's graphics as bitmaps, since RemoteViews can't tint shapes
 * or draw custom views: the icon tile, the check / + button, and the heatmap.
 */
final class WidgetGraphics {
    private WidgetGraphics() {}

    private static float dp(Context ctx, float v) {
        return v * ctx.getResources().getDisplayMetrics().density;
    }

    private static int withAlpha(int color, float alpha) {
        return Color.argb(Math.round(alpha * 255), Color.red(color), Color.green(color), Color.blue(color));
    }

    /** The habit's icon in its color, on a soft circle of the same color (like the app). */
    static Bitmap iconTile(Context ctx, String icon, int color) {
        int size = Math.round(dp(ctx, 40));
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        Paint bg = new Paint(Paint.ANTI_ALIAS_FLAG);
        bg.setColor(withAlpha(color, 0.16f));
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, bg);

        int res = ctx.getResources().getIdentifier("widget_icon_" + icon.replace('-', '_'), "drawable", ctx.getPackageName());
        if (res == 0) res = ctx.getResources().getIdentifier("widget_icon_target", "drawable", ctx.getPackageName());
        Drawable d = null;
        try {
            d = res == 0 ? null : ContextCompat.getDrawable(ctx, res);
        } catch (RuntimeException e) {
            // A broken icon shouldn't take the widget down; show the tile alone.
        }
        if (d != null) {
            d = DrawableCompat.wrap(d.mutate());
            DrawableCompat.setTint(d, color);
            int inset = Math.round(size * 0.23f);
            d.setBounds(inset, inset, size - inset, size - inset);
            d.draw(canvas);
        }
        return bmp;
    }

    /**
     * The tap target on the right. Done / not done habits: a filled circle with a
     * check, or an outlined one with a plus. Measurable habits: a progress ring
     * around a plus.
     */
    static Bitmap actionButton(Context ctx, WidgetStore.Habit row) {
        int size = Math.round(dp(ctx, 50));
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        float c = size / 2f;
        float stroke = dp(ctx, 2.5f);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStrokeCap(Paint.Cap.ROUND);
        p.setStrokeJoin(Paint.Join.ROUND);

        if (row.measurable()) {
            RectF ring = new RectF(stroke, stroke, size - stroke, size - stroke);
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(stroke);
            p.setColor(withAlpha(row.color, 0.25f));
            canvas.drawOval(ring, p);
            float progress = (float) Math.min(1, row.amount / row.target);
            if (progress > 0) {
                p.setColor(row.color);
                canvas.drawArc(ring, -90, 360 * progress, false, p);
            }
        } else if (row.done) {
            p.setStyle(Paint.Style.FILL);
            p.setColor(row.color);
            canvas.drawCircle(c, c, c - dp(ctx, 1), p);
        } else {
            p.setStyle(Paint.Style.STROKE);
            p.setStrokeWidth(dp(ctx, 2));
            p.setColor(row.color);
            canvas.drawCircle(c, c, c - dp(ctx, 2), p);
        }

        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(dp(ctx, 2.5f));
        float s = size / 36f;
        Path glyph = new Path();
        if (!row.measurable() && row.done) {
            p.setColor(Color.WHITE);
            glyph.moveTo(11 * s, 18.5f * s);
            glyph.lineTo(16 * s, 23.5f * s);
            glyph.lineTo(25 * s, 13 * s);
        } else {
            p.setColor(row.color);
            glyph.moveTo(c, 12 * s);
            glyph.lineTo(c, 24 * s);
            glyph.moveTo(12 * s, c);
            glyph.lineTo(24 * s, c);
        }
        canvas.drawPath(glyph, p);
        return bmp;
    }

    /** Days per heatmap column: fewer rows than a week keeps the dots large. */
    private static final int ROWS = 5;

    /**
     * The habit's recent days as dots, ROWS days per column, filled down then
     * across, ending with today in the bottom-right corner. As many columns
     * as fit the given size.
     */
    static Bitmap heatmap(Context ctx, WidgetStore.Habit habit, int width, int height) {
        width = Math.max(1, width);
        height = Math.max(1, height);
        Bitmap bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        // Dots with a quarter-dot gap, using most (not all) of the height so the
        // heatmap stays a little lighter than the header.
        float dot = Math.min(0.88f * height / (ROWS + (ROWS - 1) * 0.25f), dp(ctx, 20));
        float gap = dot * 0.25f;
        int cols = Math.max(1, (int) ((width + gap) / (dot + gap)));
        float used = cols * dot + (cols - 1) * gap;
        float left = (width - used) / 2f;
        float top = (height - (ROWS * dot + (ROWS - 1) * gap)) / 2f;

        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        int empty = Color.argb(41, 120, 120, 128);
        int before = Color.argb(18, 120, 120, 128);
        int last = habit.history.length - 1;
        for (int col = 0; col < cols; col++) {
            for (int row = 0; row < ROWS; row++) {
                int daysBack = (cols - 1 - col) * ROWS + (ROWS - 1 - row);
                int i = last - daysBack;
                double v = i >= 0 ? habit.history[i] : -1;
                if (v >= 1) p.setColor(habit.color);
                else if (v > 0) p.setColor(withAlpha(habit.color, (float) (0.25 + v * 0.45)));
                else if (v < 0) p.setColor(before);
                else p.setColor(empty);
                float cx = left + col * (dot + gap) + dot / 2f;
                float cy = top + row * (dot + gap) + dot / 2f;
                canvas.drawCircle(cx, cy, dot / 2f, p);
            }
        }
        return bmp;
    }
}
