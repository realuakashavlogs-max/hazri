package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.data.model.AttendanceRecord
import com.example.data.model.AttendanceStatusType
import com.example.data.model.ClassEntity
import com.example.data.model.GlobalSettings
import com.example.data.model.StudentEntity
import com.example.data.model.User
import com.example.data.model.UserSettings

@Database(
    entities = [
        User::class,
        ClassEntity::class,
        StudentEntity::class,
        AttendanceRecord::class,
        AttendanceStatusType::class,
        UserSettings::class,
        GlobalSettings::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun classDao(): ClassDao
    abstract fun studentDao(): StudentDao
    abstract fun attendanceDao(): AttendanceDao
    abstract fun statusTypeDao(): StatusTypeDao
    abstract fun settingsDao(): SettingsDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "hazri_book.db"
                )
                    .fallbackToDestructiveMigration(true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
