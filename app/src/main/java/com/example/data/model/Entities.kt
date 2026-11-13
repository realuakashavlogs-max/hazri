package com.example.data.model

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "users",
    indices = [Index(value = ["email"], unique = true)]
)
data class User(
    @PrimaryKey
    val id: String,
    val email: String,
    val passwordHash: String,
    val fullName: String,
    val role: String = ROLE_USER, // "user" or "admin"
    val isBlocked: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
) {
    companion object {
        const val ROLE_USER = "user"
        const val ROLE_ADMIN = "admin"
    }

    val isAdmin: Boolean get() = role == ROLE_ADMIN
}

@Entity(
    tableName = "classes",
    indices = [Index(value = ["userId", "name"])]
)
data class ClassEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val name: String,
    val section: String = "",
    val description: String = "",
    val isArchived: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "students",
    indices = [Index(value = ["userId", "classId"])]
)
data class StudentEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val classId: String,
    val name: String,
    val rollNumber: String = "",
    val parentName: String = "",
    val parentPhone: String = "", // WhatsApp number
    val notes: String = "",
    val isArchived: Boolean = false,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "attendance",
    indices = [
        Index(value = ["userId", "classId", "date"]),
        Index(value = ["studentId", "date"], unique = true) // 1 record per student per date
    ]
)
data class AttendanceRecord(
    @PrimaryKey
    val id: String, // typically "${studentId}_${date}"
    val userId: String,
    val classId: String,
    val studentId: String,
    val date: String, // YYYY-MM-DD
    val statusId: String,
    val note: String = "",
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "status_types",
    indices = [Index(value = ["userId", "code"])]
)
data class AttendanceStatusType(
    @PrimaryKey
    val id: String,
    val userId: String,
    val code: String, // "present", "absent", "late", "leave", etc.
    val nameEn: String,
    val nameUr: String,
    val colorHex: String,
    val isPresentCount: Boolean, // counts towards present %
    val sortOrder: Int = 0,
    val isSystem: Boolean = false
) {
    companion object {
        const val CODE_PRESENT = "present"
        const val CODE_ABSENT = "absent"
        const val CODE_LATE = "late"
        const val CODE_LEAVE = "leave"
    }
}

@Entity(
    tableName = "user_settings"
)
data class UserSettings(
    @PrimaryKey
    val userId: String,
    val appDisplayName: String = "Hazri Book",
    val primaryColorHex: String = "#124E3F",
    val isDarkMode: Boolean = false,
    val language: String = "en", // "en" or "ur"
    val whatsappTemplate: String = "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
)

@Entity(
    tableName = "global_settings"
)
data class GlobalSettings(
    @PrimaryKey
    val id: Int = 1,
    val defaultAppName: String = "Hazri Book",
    val defaultColorHex: String = "#124E3F",
    val defaultLanguage: String = "en",
    val defaultWhatsappTemplate: String = "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
)
