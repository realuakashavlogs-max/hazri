package com.example.data.repository

import android.content.Context
import android.net.Uri
import com.example.data.local.AppDatabase
import com.example.data.model.AttendanceRecord
import com.example.data.model.AttendanceStatusType
import com.example.data.model.ClassEntity
import com.example.data.model.GlobalSettings
import com.example.data.model.StudentEntity
import com.example.data.model.User
import com.example.data.model.UserSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.URLEncoder
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID

class HazriRepository(private val context: Context) {
    private val db = AppDatabase.getInstance(context)
    private val prefs = context.getSharedPreferences("hazri_prefs", Context.MODE_PRIVATE)

    private val _currentUserId = MutableStateFlow<String?>(prefs.getString("current_user_id", null))
    val currentUserId: StateFlow<String?> = _currentUserId.asStateFlow()

    // For Admin inspecting a specific user's records in read-only mode
    private val _inspectingUserId = MutableStateFlow<String?>(null)
    val inspectingUserId: StateFlow<String?> = _inspectingUserId.asStateFlow()

    init {
        CoroutineScope(Dispatchers.IO).launch {
            seedInitialDataIfNeeded()
        }
    }

    private fun hashPassword(password: String): String {
        val bytes = MessageDigest.getInstance("SHA-256").digest(password.toByteArray())
        return bytes.joinToString("") { "%02x".format(it) }
    }

    private suspend fun seedInitialDataIfNeeded() = withContext(Dispatchers.IO) {
        val userCount = db.userDao().getUserCount()
        if (userCount == 0) {
            // Seed Admin
            val adminId = "admin_01"
            val adminUser = User(
                id = adminId,
                email = "realuakashavlogs@gmail.com",
                passwordHash = hashPassword("Admin123"),
                fullName = "App Administrator",
                role = User.ROLE_ADMIN,
                isBlocked = false
            )
            db.userDao().insertUser(adminUser)

            // Seed Sample Teacher
            val teacherId = "teacher_01"
            val teacherUser = User(
                id = teacherId,
                email = "teacher@hazribook.com",
                passwordHash = hashPassword("Teacher123"),
                fullName = "Ustadh Ahmad",
                role = User.ROLE_USER,
                isBlocked = false
            )
            db.userDao().insertUser(teacherUser)

            // Global Settings
            val globalSettings = GlobalSettings(
                id = 1,
                defaultAppName = "Hazri Book",
                defaultColorHex = "#124E3F",
                defaultLanguage = "en",
                defaultWhatsappTemplate = "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
            )
            db.settingsDao().upsertGlobalSettings(globalSettings)

            // User Settings for both
            listOf(adminId, teacherId).forEach { uid ->
                db.settingsDao().upsertUserSettings(
                    UserSettings(
                        userId = uid,
                        appDisplayName = if (uid == adminId) "Hazri Book Admin" else "Dar-ul-Ilm Academy",
                        primaryColorHex = "#124E3F",
                        language = "en",
                        whatsappTemplate = globalSettings.defaultWhatsappTemplate
                    )
                )
                seedDefaultStatusTypesForUser(uid)
            }

            // Seed sample classes and students for teacher
            val class1Id = "class_01"
            val class2Id = "class_02"
            db.classDao().insertClass(
                ClassEntity(
                    id = class1Id,
                    userId = teacherId,
                    name = "Class 5 - Green",
                    section = "Morning Batch",
                    description = "Grade 5 regular attendance"
                )
            )
            db.classDao().insertClass(
                ClassEntity(
                    id = class2Id,
                    userId = teacherId,
                    name = "Hifz Section A",
                    section = "Tahfiz-ul-Quran",
                    description = "Quran memorization students"
                )
            )

            // Students
            val studentsClass1 = listOf(
                StudentEntity(
                    id = "std_101",
                    userId = teacherId,
                    classId = class1Id,
                    name = "Muhammad Ali",
                    rollNumber = "101",
                    parentName = "Tariq Ali",
                    parentPhone = "923001234567",
                    notes = "Very attentive"
                ),
                StudentEntity(
                    id = "std_102",
                    userId = teacherId,
                    classId = class1Id,
                    name = "Fatima Zahra",
                    rollNumber = "102",
                    parentName = "Zahid Hussain",
                    parentPhone = "923007654321",
                    notes = "Class monitor"
                ),
                StudentEntity(
                    id = "std_103",
                    userId = teacherId,
                    classId = class1Id,
                    name = "Zainab Bibi",
                    rollNumber = "103",
                    parentName = "Rashid Khan",
                    parentPhone = "923214567890",
                    notes = "Bus student"
                ),
                StudentEntity(
                    id = "std_104",
                    userId = teacherId,
                    classId = class1Id,
                    name = "Bilal Ahmed",
                    rollNumber = "104",
                    parentName = "Ahmed Kamal",
                    parentPhone = "923339876543",
                    notes = ""
                ),
                StudentEntity(
                    id = "std_105",
                    userId = teacherId,
                    classId = class1Id,
                    name = "Ayesha Noor",
                    rollNumber = "105",
                    parentName = "Noor Muhammad",
                    parentPhone = "923451122334",
                    notes = ""
                )
            )
            db.studentDao().insertStudents(studentsClass1)

            val studentsClass2 = listOf(
                StudentEntity(
                    id = "std_201",
                    userId = teacherId,
                    classId = class2Id,
                    name = "Usman Farooq",
                    rollNumber = "01",
                    parentName = "Farooq Azam",
                    parentPhone = "923123456780",
                    notes = "Completed 15 Paras"
                ),
                StudentEntity(
                    id = "std_202",
                    userId = teacherId,
                    classId = class2Id,
                    name = "Hamza Yousuf",
                    rollNumber = "02",
                    parentName = "Yousuf Khan",
                    parentPhone = "923223344556",
                    notes = "Sabqi revision"
                )
            )
            db.studentDao().insertStudents(studentsClass2)

            // Default login to teacher for immediate preview
            if (_currentUserId.value == null) {
                setCurrentUser(teacherId)
            }
        }
    }

    suspend fun seedDefaultStatusTypesForUser(userId: String) = withContext(Dispatchers.IO) {
        val defaultStatuses = listOf(
            AttendanceStatusType(
                id = "${userId}_present",
                userId = userId,
                code = AttendanceStatusType.CODE_PRESENT,
                nameEn = "Present",
                nameUr = "حاضر",
                colorHex = "#2E7D32", // Green
                isPresentCount = true,
                sortOrder = 0,
                isSystem = true
            ),
            AttendanceStatusType(
                id = "${userId}_absent",
                userId = userId,
                code = AttendanceStatusType.CODE_ABSENT,
                nameEn = "Absent",
                nameUr = "غیر حاضر",
                colorHex = "#D32F2F", // Red
                isPresentCount = false,
                sortOrder = 1,
                isSystem = true
            ),
            AttendanceStatusType(
                id = "${userId}_late",
                userId = userId,
                code = AttendanceStatusType.CODE_LATE,
                nameEn = "Late",
                nameUr = "دیر سے",
                colorHex = "#F57C00", // Orange
                isPresentCount = true,
                sortOrder = 2,
                isSystem = true
            ),
            AttendanceStatusType(
                id = "${userId}_leave",
                userId = userId,
                code = AttendanceStatusType.CODE_LEAVE,
                nameEn = "Leave",
                nameUr = "رخصت",
                colorHex = "#1976D2", // Blue
                isPresentCount = false,
                sortOrder = 3,
                isSystem = true
            )
        )
        db.statusTypeDao().insertStatusTypes(defaultStatuses)
    }

    // Auth & Session
    fun setCurrentUser(userId: String?) {
        _currentUserId.value = userId
        _inspectingUserId.value = null
        if (userId != null) {
            prefs.edit().putString("current_user_id", userId).apply()
        } else {
            prefs.edit().remove("current_user_id").apply()
        }
    }

    fun setInspectingUser(userId: String?) {
        _inspectingUserId.value = userId
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    fun getCurrentUserFlow(): Flow<User?> {
        return _currentUserId.flatMapLatest { uid ->
            if (uid != null) db.userDao().getUserById(uid) else flowOf(null)
        }
    }

    suspend fun login(email: String, password: String): Result<User> = withContext(Dispatchers.IO) {
        val user = db.userDao().getUserByEmail(email.trim())
            ?: return@withContext Result.failure(Exception("No account found with this email"))

        if (user.isBlocked) {
            return@withContext Result.failure(Exception("Your account has been blocked by the administrator"))
        }

        val hash = hashPassword(password)
        if (user.passwordHash != hash) {
            return@withContext Result.failure(Exception("Incorrect password"))
        }

        setCurrentUser(user.id)
        Result.success(user)
    }

    suspend fun signUp(email: String, password: String, fullName: String): Result<User> = withContext(Dispatchers.IO) {
        val existing = db.userDao().getUserByEmail(email.trim())
        if (existing != null) {
            return@withContext Result.failure(Exception("An account with this email already exists"))
        }

        val newId = UUID.randomUUID().toString()
        val user = User(
            id = newId,
            email = email.trim(),
            passwordHash = hashPassword(password),
            fullName = fullName.trim(),
            role = User.ROLE_USER,
            isBlocked = false
        )
        db.userDao().insertUser(user)

        // Clone global settings defaults
        val global = db.settingsDao().getGlobalSettingsDirect()
        db.settingsDao().upsertUserSettings(
            UserSettings(
                userId = newId,
                appDisplayName = global?.defaultAppName ?: "Hazri Book",
                primaryColorHex = global?.defaultColorHex ?: "#124E3F",
                language = global?.defaultLanguage ?: "en",
                whatsappTemplate = global?.defaultWhatsappTemplate
                    ?: "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
            )
        )
        seedDefaultStatusTypesForUser(newId)

        setCurrentUser(newId)
        Result.success(user)
    }

    suspend fun resetPassword(email: String, newPass: String): Result<Unit> = withContext(Dispatchers.IO) {
        val user = db.userDao().getUserByEmail(email.trim())
            ?: return@withContext Result.failure(Exception("User not found"))
        db.userDao().updateUser(user.copy(passwordHash = hashPassword(newPass)))
        Result.success(Unit)
    }

    // Active User ID for data querying (returns inspected user if in admin read-only mode)
    fun getEffectiveUserId(): String? {
        return _inspectingUserId.value ?: _currentUserId.value
    }

    // Classes
    fun getClasses(userId: String): Flow<List<ClassEntity>> = db.classDao().getActiveClassesForUser(userId)
    fun getAllClasses(userId: String): Flow<List<ClassEntity>> = db.classDao().getAllClassesForUser(userId)

    suspend fun createClass(name: String, section: String, description: String): String = withContext(Dispatchers.IO) {
        val uid = _currentUserId.value ?: throw IllegalStateException("Not logged in")
        val id = UUID.randomUUID().toString()
        db.classDao().insertClass(
            ClassEntity(
                id = id,
                userId = uid,
                name = name.trim(),
                section = section.trim(),
                description = description.trim()
            )
        )
        id
    }

    suspend fun updateClass(classEntity: ClassEntity) = withContext(Dispatchers.IO) {
        db.classDao().updateClass(classEntity)
    }

    suspend fun archiveClass(classId: String, archived: Boolean) = withContext(Dispatchers.IO) {
        db.classDao().setClassArchived(classId, archived)
    }

    suspend fun deleteClassAndCascade(classId: String) = withContext(Dispatchers.IO) {
        db.attendanceDao().deleteAttendanceForClass(classId)
        db.studentDao().deleteStudentsByClass(classId)
        db.classDao().deleteClass(classId)
    }

    // Students
    fun getStudentsForClass(userId: String, classId: String): Flow<List<StudentEntity>> =
        db.studentDao().getActiveStudentsForClass(userId, classId)

    fun getAllStudentsForUser(userId: String): Flow<List<StudentEntity>> =
        db.studentDao().getAllActiveStudentsForUser(userId)

    suspend fun addStudent(
        classId: String,
        name: String,
        rollNumber: String,
        parentName: String,
        parentPhone: String,
        notes: String
    ): String = withContext(Dispatchers.IO) {
        val uid = _currentUserId.value ?: throw IllegalStateException("Not logged in")
        val id = UUID.randomUUID().toString()
        db.studentDao().insertStudent(
            StudentEntity(
                id = id,
                userId = uid,
                classId = classId,
                name = name.trim(),
                rollNumber = rollNumber.trim(),
                parentName = parentName.trim(),
                parentPhone = parentPhone.trim(),
                notes = notes.trim()
            )
        )
        id
    }

    suspend fun bulkAddStudents(classId: String, rawNames: String): Int = withContext(Dispatchers.IO) {
        val uid = _currentUserId.value ?: throw IllegalStateException("Not logged in")
        val lines = rawNames.lines().map { it.trim() }.filter { it.isNotBlank() }
        val students = lines.mapIndexed { index, line ->
            // Support "RollNo, Name, Phone" or just "Name"
            val parts = line.split(",").map { it.trim() }
            val roll = if (parts.size > 1 && parts[0].matches(Regex("^\\d+$"))) parts[0] else ""
            val name = if (roll.isNotBlank()) parts[1] else parts[0]
            val phone = if (parts.size > 2) parts[2] else ""
            StudentEntity(
                id = UUID.randomUUID().toString(),
                userId = uid,
                classId = classId,
                name = name,
                rollNumber = roll,
                parentPhone = phone
            )
        }
        if (students.isNotEmpty()) {
            db.studentDao().insertStudents(students)
        }
        students.size
    }

    suspend fun updateStudent(student: StudentEntity) = withContext(Dispatchers.IO) {
        db.studentDao().updateStudent(student)
    }

    suspend fun archiveStudent(studentId: String, archived: Boolean) = withContext(Dispatchers.IO) {
        db.studentDao().setStudentArchived(studentId, archived)
    }

    suspend fun deleteStudent(studentId: String) = withContext(Dispatchers.IO) {
        db.attendanceDao().deleteAttendanceForStudent(studentId)
        db.studentDao().deleteStudent(studentId)
    }

    // Attendance
    fun getAttendanceForDate(userId: String, classId: String, date: String): Flow<List<AttendanceRecord>> =
        db.attendanceDao().getAttendanceForDate(userId, classId, date)

    fun getAttendanceForClassRange(userId: String, classId: String, startDate: String, endDate: String): Flow<List<AttendanceRecord>> =
        db.attendanceDao().getAttendanceForClassRange(userId, classId, startDate, endDate)

    fun getAllAttendanceForUser(userId: String): Flow<List<AttendanceRecord>> =
        db.attendanceDao().getAllAttendanceForUser(userId)

    suspend fun saveAttendanceRecord(
        classId: String,
        studentId: String,
        date: String,
        statusId: String,
        note: String = ""
    ) = withContext(Dispatchers.IO) {
        val uid = _currentUserId.value ?: throw IllegalStateException("Not logged in")
        val record = AttendanceRecord(
            id = "${studentId}_$date",
            userId = uid,
            classId = classId,
            studentId = studentId,
            date = date,
            statusId = statusId,
            note = note,
            updatedAt = System.currentTimeMillis()
        )
        db.attendanceDao().upsertAttendance(record)
    }

    suspend fun saveBatchAttendance(records: List<AttendanceRecord>) = withContext(Dispatchers.IO) {
        db.attendanceDao().upsertAttendanceList(records)
    }

    // Status Types
    fun getStatusTypes(userId: String): Flow<List<AttendanceStatusType>> =
        db.statusTypeDao().getStatusTypesForUser(userId)

    suspend fun addCustomStatusType(
        nameEn: String,
        nameUr: String,
        colorHex: String,
        isPresentCount: Boolean
    ) = withContext(Dispatchers.IO) {
        val uid = _currentUserId.value ?: throw IllegalStateException("Not logged in")
        val code = nameEn.lowercase().replace(" ", "_")
        val existing = db.statusTypeDao().getStatusTypesForUserDirect(uid)
        val id = UUID.randomUUID().toString()
        db.statusTypeDao().insertStatusType(
            AttendanceStatusType(
                id = id,
                userId = uid,
                code = code,
                nameEn = nameEn.trim(),
                nameUr = nameUr.trim(),
                colorHex = colorHex,
                isPresentCount = isPresentCount,
                sortOrder = existing.size,
                isSystem = false
            )
        )
    }

    suspend fun updateStatusType(statusType: AttendanceStatusType) = withContext(Dispatchers.IO) {
        db.statusTypeDao().updateStatusType(statusType)
    }

    suspend fun deleteStatusType(statusId: String): Result<Unit> = withContext(Dispatchers.IO) {
        val count = db.attendanceDao().getStatusUsageCount(statusId)
        if (count > 0) {
            return@withContext Result.failure(Exception("Status type is in use by $count attendance records. Please reassign records first."))
        }
        db.statusTypeDao().deleteStatusType(statusId)
        Result.success(Unit)
    }

    // User Settings & Global Settings
    fun getUserSettings(userId: String): Flow<UserSettings?> = db.settingsDao().getUserSettings(userId)

    suspend fun updateUserSettings(settings: UserSettings) = withContext(Dispatchers.IO) {
        db.settingsDao().upsertUserSettings(settings)
    }

    fun getGlobalSettings(): Flow<GlobalSettings?> = db.settingsDao().getGlobalSettings()

    suspend fun updateGlobalSettings(settings: GlobalSettings) = withContext(Dispatchers.IO) {
        db.settingsDao().upsertGlobalSettings(settings)
    }

    // Admin Panel
    fun getAllUsers(): Flow<List<User>> = db.userDao().getAllUsers()

    suspend fun setUserBlocked(userId: String, isBlocked: Boolean) = withContext(Dispatchers.IO) {
        db.userDao().setUserBlocked(userId, isBlocked)
    }

    suspend fun setUserRole(userId: String, role: String) = withContext(Dispatchers.IO) {
        db.userDao().setUserRole(userId, role)
    }

    // WhatsApp URL Generator
    fun generateWhatsAppUrl(
        template: String,
        studentName: String,
        className: String,
        statusText: String,
        date: String,
        appName: String,
        parentPhone: String
    ): String {
        val cleanPhone = parentPhone.replace(Regex("[^0-9]"), "")
        val message = template
            .replace("{student_name}", studentName)
            .replace("{class_name}", className)
            .replace("{status}", statusText)
            .replace("{date}", date)
            .replace("{app_name}", appName)

        val encoded = URLEncoder.encode(message, "UTF-8")
        return if (cleanPhone.isNotBlank()) {
            "https://wa.me/$cleanPhone?text=$encoded"
        } else {
            "https://wa.me/?text=$encoded"
        }
    }
}
