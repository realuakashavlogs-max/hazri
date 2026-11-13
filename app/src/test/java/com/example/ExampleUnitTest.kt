package com.example

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.net.URLEncoder

class ExampleUnitTest {
    @Test
    fun testAttendanceRecordIdFormat() {
        val studentId = "std_101"
        val date = "2026-11-12"
        val expectedRecordId = "${studentId}_$date"
        assertEquals("std_101_2026-11-12", expectedRecordId)
    }

    @Test
    fun testWhatsAppMessagePlaceholderReplacement() {
        val template = "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
        val replaced = template
            .replace("{student_name}", "Muhammad Ali")
            .replace("{class_name}", "Class 5 - Green")
            .replace("{status}", "Absent")
            .replace("{date}", "2026-11-12")
            .replace("{app_name}", "Hazri Book")

        assertTrue(replaced.contains("Muhammad Ali"))
        assertTrue(replaced.contains("Class 5 - Green"))
        assertTrue(replaced.contains("Absent"))
        assertTrue(replaced.contains("Hazri Book"))

        val encoded = URLEncoder.encode(replaced, "UTF-8")
        val url = "https://wa.me/923001234567?text=$encoded"
        assertTrue(url.startsWith("https://wa.me/923001234567?text="))
    }

    @Test
    fun testAttendancePercentageCalculation() {
        val totalSessions = 20
        val presentCount = 18
        val percentage = (presentCount.toFloat() / totalSessions) * 100f
        assertEquals(90f, percentage, 0.01f)
    }
}
