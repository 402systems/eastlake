package expo.modules.quotebreak

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray

/**
 * Shared storage for the module (JS-facing) and the always-running service/receiver,
 * which can't rely on the JS runtime being alive.
 */
internal object QuoteBreakPrefs {
  private const val PREFS_NAME = "quote_break_prefs"

  private const val KEY_QUOTES = "quotes"
  private const val KEY_THRESHOLD_MINUTES = "threshold_minutes"
  private const val KEY_ENABLED = "enabled"
  private const val KEY_ACCUMULATED_MS = "accumulated_ms"
  private const val KEY_SCREEN_ON_SINCE = "screen_on_since"

  private const val DEFAULT_THRESHOLD_MINUTES = 15

  private fun prefs(context: Context): SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun setQuotes(context: Context, quotes: List<String>) {
    prefs(context).edit().putString(KEY_QUOTES, JSONArray(quotes).toString()).apply()
  }

  fun getQuotes(context: Context): List<String> {
    val raw = prefs(context).getString(KEY_QUOTES, null) ?: return emptyList()
    return try {
      val array = JSONArray(raw)
      (0 until array.length()).map { array.getString(it) }
    } catch (e: Exception) {
      emptyList()
    }
  }

  fun setThresholdMinutes(context: Context, minutes: Int) {
    prefs(context).edit().putInt(KEY_THRESHOLD_MINUTES, minutes).apply()
  }

  fun getThresholdMinutes(context: Context): Int =
    prefs(context).getInt(KEY_THRESHOLD_MINUTES, DEFAULT_THRESHOLD_MINUTES)

  fun setEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun isEnabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)

  fun getAccumulatedMs(context: Context): Long = prefs(context).getLong(KEY_ACCUMULATED_MS, 0L)

  fun setAccumulatedMs(context: Context, ms: Long) {
    prefs(context).edit().putLong(KEY_ACCUMULATED_MS, ms).apply()
  }

  /** Timestamp the screen last turned on, or -1 if the screen is currently off. */
  fun getScreenOnSince(context: Context): Long = prefs(context).getLong(KEY_SCREEN_ON_SINCE, -1L)

  fun setScreenOnSince(context: Context, timestamp: Long) {
    prefs(context).edit().putLong(KEY_SCREEN_ON_SINCE, timestamp).apply()
  }
}
