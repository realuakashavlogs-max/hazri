package com.example.util

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection

val LocalAppLanguage = compositionLocalOf { "en" }

object AppStrings {
    private val translations = mapOf(
        "app_name" to Pair("Hazri Book", "حاضری بک"),
        "attendance" to Pair("Attendance", "حاضری"),
        "classes" to Pair("Classes", "کلاسیں"),
        "students" to Pair("Students", "طلباء"),
        "reports" to Pair("Reports", "رپورٹس"),
        "settings" to Pair("Settings", "ترتیبات"),
        "admin_panel" to Pair("Admin Panel", "ایڈمن پینل"),
        "ai_advisor" to Pair("AI Advisor", "ذہین مشیر"),
        "mark_all_present" to Pair("Mark All Present", "سب کو حاضر کریں"),
        "save_attendance" to Pair("Save Attendance", "حاضری محفوظ کریں"),
        "date" to Pair("Date", "تاریخ"),
        "class" to Pair("Class", "کلاس"),
        "present" to Pair("Present", "حاضر"),
        "absent" to Pair("Absent", "غیر حاضر"),
        "late" to Pair("Late", "دیر سے"),
        "leave" to Pair("Leave", "رخصت"),
        "whatsapp_parent" to Pair("Notify Parent (WhatsApp)", "والدین کو مطلع کریں (واٹس ایپ)"),
        "search_students" to Pair("Search students...", "طالب علم تلاش کریں..."),
        "add_student" to Pair("Add Student", "طالب علم شامل کریں"),
        "bulk_add" to Pair("Bulk Add", "یکبارگی اندراج"),
        "add_class" to Pair("Add Class", "نئی کلاس"),
        "total_students" to Pair("Total Students", "کل طلباء"),
        "roll_no" to Pair("Roll No", "رول نمبر"),
        "parent_phone" to Pair("WhatsApp Number", "واٹس ایپ نمبر"),
        "parent_name" to Pair("Parent Name", "والد کا نام"),
        "notes" to Pair("Notes", "نوٹس"),
        "daily_summary" to Pair("Daily Summary", "روزانہ خلاصہ"),
        "monthly_report" to Pair("Monthly Report", "ماہانہ رپورٹ"),
        "attendance_rate" to Pair("Attendance Rate", "حاضری کا تناسب"),
        "export_csv" to Pair("Export CSV", "ایکسپورٹ CSV"),
        "print_report" to Pair("Print / PDF", "پرنٹ / پی ڈی ایف"),
        "offline_ready" to Pair("Offline Ready (Synced)", "آف لائن تیار (محفوظ)"),
        "logout" to Pair("Logout", "لاگ آؤٹ"),
        "login" to Pair("Login", "لاگ ان"),
        "signup" to Pair("Sign Up", "رجسٹریشن"),
        "admin_badge" to Pair("Admin Mode", "ایڈمن موڈ"),
        "read_only_notice" to Pair("Viewing user in read-only mode", "صارف کا ڈیٹا صرف دیکھنے کے لیے ہے"),
        "exit_inspection" to Pair("Exit User View", "صارف کا نظارہ بند کریں"),
        "deep_thinking" to Pair("Deep Thinking (High Reasoning)", "گہری سوچ (اعلیٰ تجزیہ)"),
        "ask_ai" to Pair("Ask AI Attendance Advisor...", "حاضری مشیر سے سوال پوچھیں..."),
        "custom_status" to Pair("Custom Status Types", "اپنی مرضی کے حاضری سٹیٹس"),
        "whatsapp_template" to Pair("WhatsApp Message Template", "واٹس ایپ میسج ٹیمپلیٹ")
    )

    fun get(key: String, lang: String): String {
        val pair = translations[key] ?: return key
        return if (lang == "ur") pair.second else pair.first
    }
}

@Composable
fun AppLanguageProvider(
    language: String,
    content: @Composable () -> Unit
) {
    val direction = if (language == "ur") LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(
        LocalAppLanguage provides language,
        LocalLayoutDirection provides direction
    ) {
        content()
    }
}
