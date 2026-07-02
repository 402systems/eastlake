package expo.modules.quotebreak

import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class QuoteBreakModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("QuoteBreakModule")

    Function("setQuotes") { quotes: List<String> ->
      QuoteBreakPrefs.setQuotes(context, quotes)
    }

    Function("setThresholdMinutes") { minutes: Int ->
      QuoteBreakPrefs.setThresholdMinutes(context, minutes)
    }

    Function("isMonitoring") {
      QuoteBreakPrefs.isEnabled(context)
    }

    Function("startMonitoring") {
      QuoteBreakPrefs.setEnabled(context, true)
      val intent = Intent(context, ScreenTimeService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    Function("stopMonitoring") {
      QuoteBreakPrefs.setEnabled(context, false)
      context.stopService(Intent(context, ScreenTimeService::class.java))
    }
  }
}
