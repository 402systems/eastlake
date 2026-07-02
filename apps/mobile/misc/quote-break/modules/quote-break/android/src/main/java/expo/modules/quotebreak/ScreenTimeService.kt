package expo.modules.quotebreak

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Foreground service that treats "screen on" as a proxy for "on your phone": it accumulates
 * screen-on time and fires a notification with a random quote once the configured threshold
 * is reached, then starts counting again from zero.
 */
class ScreenTimeService : Service() {

  companion object {
    private const val SERVICE_CHANNEL_ID = "quote_break_service"
    private const val ALERT_CHANNEL_ID = "quote_break_alerts"
    private const val SERVICE_NOTIFICATION_ID = 1001
    private const val ALERT_NOTIFICATION_ID_BASE = 2000
    private const val CHECK_INTERVAL_MS = 30_000L
  }

  private var alertCount = 0
  private var receiverRegistered = false
  private val handler = Handler(Looper.getMainLooper())

  private val checkRunnable = object : Runnable {
    override fun run() {
      checkThreshold()
      handler.postDelayed(this, CHECK_INTERVAL_MS)
    }
  }

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(receiverContext: Context, intent: Intent) {
      when (intent.action) {
        Intent.ACTION_SCREEN_ON -> onScreenOn()
        Intent.ACTION_SCREEN_OFF -> onScreenOff()
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification())

    val filter = IntentFilter().apply {
      addAction(Intent.ACTION_SCREEN_ON)
      addAction(Intent.ACTION_SCREEN_OFF)
    }
    registerReceiver(screenReceiver, filter)
    receiverRegistered = true

    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    if (powerManager.isInteractive && QuoteBreakPrefs.getScreenOnSince(this) < 0) {
      QuoteBreakPrefs.setScreenOnSince(this, System.currentTimeMillis())
    }

    handler.postDelayed(checkRunnable, CHECK_INTERVAL_MS)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    super.onDestroy()
    handler.removeCallbacks(checkRunnable)
    if (receiverRegistered) {
      unregisterReceiver(screenReceiver)
      receiverRegistered = false
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun onScreenOn() {
    QuoteBreakPrefs.setScreenOnSince(this, System.currentTimeMillis())
  }

  private fun onScreenOff() {
    val since = QuoteBreakPrefs.getScreenOnSince(this)
    if (since < 0) return
    val total = QuoteBreakPrefs.getAccumulatedMs(this) + (System.currentTimeMillis() - since)
    QuoteBreakPrefs.setScreenOnSince(this, -1L)
    if (!maybeFireAlert(total)) {
      QuoteBreakPrefs.setAccumulatedMs(this, total)
    }
  }

  private fun checkThreshold() {
    val since = QuoteBreakPrefs.getScreenOnSince(this)
    if (since < 0) return // screen is currently off; nothing new to accrue

    val total = QuoteBreakPrefs.getAccumulatedMs(this) + (System.currentTimeMillis() - since)
    if (maybeFireAlert(total)) {
      // Start a fresh window from now rather than replaying the same span again.
      QuoteBreakPrefs.setScreenOnSince(this, System.currentTimeMillis())
    }
  }

  /** Fires a quote notification and resets the counter if [totalMs] has reached the threshold. */
  private fun maybeFireAlert(totalMs: Long): Boolean {
    val thresholdMs = QuoteBreakPrefs.getThresholdMinutes(this) * 60_000L
    if (totalMs < thresholdMs) return false

    val quotes = QuoteBreakPrefs.getQuotes(this)
    if (quotes.isEmpty()) return false

    showAlertNotification(quotes.random())
    QuoteBreakPrefs.setAccumulatedMs(this, 0L)
    return true
  }

  private fun showAlertNotification(quote: String) {
    val notification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Time for a break")
      .setContentText(quote)
      .setStyle(NotificationCompat.BigTextStyle().bigText(quote))
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(ALERT_NOTIFICATION_ID_BASE + (alertCount++ % 100), notification)
  }

  private fun buildServiceNotification(): Notification =
    NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setContentTitle("Quote Break is running")
      .setContentText("Watching your screen time to send you a quote")
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setOngoing(true)
      .build()

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    manager.createNotificationChannel(
      NotificationChannel(
        SERVICE_CHANNEL_ID,
        "Quote Break status",
        NotificationManager.IMPORTANCE_MIN
      ).apply {
        description = "Ongoing notification while screen-time monitoring is active"
        setShowBadge(false)
      }
    )

    manager.createNotificationChannel(
      NotificationChannel(
        ALERT_CHANNEL_ID,
        "Quote reminders",
        NotificationManager.IMPORTANCE_DEFAULT
      ).apply {
        description = "Motivational quotes sent after time on your phone"
      }
    )
  }
}
