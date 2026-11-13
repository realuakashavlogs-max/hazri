package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.AttendanceRecord
import com.example.data.model.AttendanceStatusType
import com.example.data.model.ClassEntity
import com.example.data.model.GlobalSettings
import com.example.data.model.StudentEntity
import com.example.data.model.User
import com.example.data.model.UserSettings
import kotlinx.coroutines.flow.Flow

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    fun getUserById(id: String): Flow<User?>

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun getUserByIdDirect(id: String): User?

    @Query("SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1")
    suspend fun getUserByEmail(email: String): User?

    @Query("SELECT * FROM users ORDER BY createdAt DESC")
    fun getAllUsers(): Flow<List<User>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User)

    @Update
    suspend fun updateUser(user: User)

    @Query("UPDATE users SET isBlocked = :isBlocked WHERE id = :userId")
    suspend fun setUserBlocked(userId: String, isBlocked: Boolean)

    @Query("UPDATE users SET role = :role WHERE id = :userId")
    suspend fun setUserRole(userId: String, role: String)

    @Query("SELECT COUNT(*) FROM users")
    suspend fun getUserCount(): Int
}

@Dao
interface ClassDao {
    @Query("SELECT * FROM classes WHERE userId = :userId AND isArchived = 0 ORDER BY name ASC")
    fun getActiveClassesForUser(userId: String): Flow<List<ClassEntity>>

    @Query("SELECT * FROM classes WHERE userId = :userId ORDER BY isArchived ASC, name ASC")
    fun getAllClassesForUser(userId: String): Flow<List<ClassEntity>>

    @Query("SELECT * FROM classes WHERE id = :id")
    suspend fun getClassById(id: String): ClassEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClass(classEntity: ClassEntity)

    @Update
    suspend fun updateClass(classEntity: ClassEntity)

    @Query("DELETE FROM classes WHERE id = :id")
    suspend fun deleteClass(id: String)

    @Query("UPDATE classes SET isArchived = :isArchived WHERE id = :id")
    suspend fun setClassArchived(id: String, isArchived: Boolean)

    @Query("SELECT COUNT(*) FROM classes WHERE userId = :userId AND isArchived = 0")
    fun countClassesForUser(userId: String): Flow<Int>
}

@Dao
interface StudentDao {
    @Query("SELECT * FROM students WHERE userId = :userId AND classId = :classId AND isArchived = 0 ORDER BY rollNumber ASC, name ASC")
    fun getActiveStudentsForClass(userId: String, classId: String): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE userId = :userId AND classId = :classId ORDER BY isArchived ASC, rollNumber ASC, name ASC")
    fun getAllStudentsForClass(userId: String, classId: String): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE userId = :userId AND isArchived = 0 ORDER BY name ASC")
    fun getAllActiveStudentsForUser(userId: String): Flow<List<StudentEntity>>

    @Query("SELECT * FROM students WHERE id = :id")
    suspend fun getStudentById(id: String): StudentEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudent(student: StudentEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudents(students: List<StudentEntity>)

    @Update
    suspend fun updateStudent(student: StudentEntity)

    @Query("DELETE FROM students WHERE id = :id")
    suspend fun deleteStudent(id: String)

    @Query("DELETE FROM students WHERE classId = :classId")
    suspend fun deleteStudentsByClass(classId: String)

    @Query("UPDATE students SET isArchived = :isArchived WHERE id = :id")
    suspend fun setStudentArchived(id: String, isArchived: Boolean)

    @Query("SELECT COUNT(*) FROM students WHERE userId = :userId AND isArchived = 0")
    fun countStudentsForUser(userId: String): Flow<Int>

    @Query("SELECT COUNT(*) FROM students WHERE classId = :classId AND isArchived = 0")
    fun countStudentsForClass(classId: String): Flow<Int>
}

@Dao
interface AttendanceDao {
    @Query("SELECT * FROM attendance WHERE userId = :userId AND classId = :classId AND date = :date")
    fun getAttendanceForDate(userId: String, classId: String, date: String): Flow<List<AttendanceRecord>>

    @Query("SELECT * FROM attendance WHERE userId = :userId AND classId = :classId AND date BETWEEN :startDate AND :endDate ORDER BY date DESC")
    fun getAttendanceForClassRange(userId: String, classId: String, startDate: String, endDate: String): Flow<List<AttendanceRecord>>

    @Query("SELECT * FROM attendance WHERE studentId = :studentId ORDER BY date DESC")
    fun getAttendanceForStudent(studentId: String): Flow<List<AttendanceRecord>>

    @Query("SELECT * FROM attendance WHERE userId = :userId ORDER BY date DESC")
    fun getAllAttendanceForUser(userId: String): Flow<List<AttendanceRecord>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAttendance(record: AttendanceRecord)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAttendanceList(records: List<AttendanceRecord>)

    @Query("DELETE FROM attendance WHERE studentId = :studentId")
    suspend fun deleteAttendanceForStudent(studentId: String)

    @Query("DELETE FROM attendance WHERE classId = :classId")
    suspend fun deleteAttendanceForClass(classId: String)

    @Query("SELECT COUNT(*) FROM attendance WHERE statusId = :statusId")
    suspend fun getStatusUsageCount(statusId: String): Int
}

@Dao
interface StatusTypeDao {
    @Query("SELECT * FROM status_types WHERE userId = :userId ORDER BY sortOrder ASC")
    fun getStatusTypesForUser(userId: String): Flow<List<AttendanceStatusType>>

    @Query("SELECT * FROM status_types WHERE userId = :userId ORDER BY sortOrder ASC")
    suspend fun getStatusTypesForUserDirect(userId: String): List<AttendanceStatusType>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStatusType(statusType: AttendanceStatusType)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStatusTypes(statusTypes: List<AttendanceStatusType>)

    @Update
    suspend fun updateStatusType(statusType: AttendanceStatusType)

    @Query("DELETE FROM status_types WHERE id = :id")
    suspend fun deleteStatusType(id: String)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM user_settings WHERE userId = :userId")
    fun getUserSettings(userId: String): Flow<UserSettings?>

    @Query("SELECT * FROM user_settings WHERE userId = :userId")
    suspend fun getUserSettingsDirect(userId: String): UserSettings?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertUserSettings(settings: UserSettings)

    @Query("SELECT * FROM global_settings WHERE id = 1")
    fun getGlobalSettings(): Flow<GlobalSettings?>

    @Query("SELECT * FROM global_settings WHERE id = 1")
    suspend fun getGlobalSettingsDirect(): GlobalSettings?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertGlobalSettings(settings: GlobalSettings)
}
