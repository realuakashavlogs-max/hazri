package com.example.ui.viewmodel

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.data.model.AttendanceRecord
import com.example.data.model.AttendanceStatusType
import com.example.data.model.ClassEntity
import com.example.data.model.GlobalSettings
import com.example.data.model.StudentEntity
import com.example.data.model.User
import com.example.data.model.UserSettings
import com.example.data.repository.AiAttendanceAdvisor
import com.example.data.repository.AiAdvisorUiState
import com.example.data.repository.HazriRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

// Factory to inject HazriRepository and AiAttendanceAdvisor
class HazriViewModelFactory(
    private val repository: HazriRepository,
    private val aiAdvisor: AiAttendanceAdvisor
) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(AuthViewModel::class.java) -> AuthViewModel(repository) as T
            modelClass.isAssignableFrom(AttendanceViewModel::class.java) -> AttendanceViewModel(repository) as T
            modelClass.isAssignableFrom(ClassesViewModel::class.java) -> ClassesViewModel(repository) as T
            modelClass.isAssignableFrom(StudentsViewModel::class.java) -> StudentsViewModel(repository) as T
            modelClass.isAssignableFrom(ReportsViewModel::class.java) -> ReportsViewModel(repository) as T
            modelClass.isAssignableFrom(SettingsViewModel::class.java) -> SettingsViewModel(repository) as T
            modelClass.isAssignableFrom(AdminViewModel::class.java) -> AdminViewModel(repository) as T
            modelClass.isAssignableFrom(AiAdvisorViewModel::class.java) -> AiAdvisorViewModel(repository, aiAdvisor) as T
            else -> throw IllegalArgumentException("Unknown ViewModel class: ${modelClass.name}")
        }
    }
}

// -------------------------------------------------------------
// Auth ViewModel
// -------------------------------------------------------------
class AuthViewModel(private val repository: HazriRepository) : ViewModel() {
    val currentUser: StateFlow<User?> = repository.getCurrentUserFlow()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    fun login(email: String, pass: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            val result = repository.login(email, pass)
            _isLoading.value = false
            result.onSuccess {
                onSuccess()
            }.onFailure {
                _authError.value = it.localizedMessage ?: "Login failed"
            }
        }
    }

    fun signUp(email: String, pass: String, name: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isLoading.value = true
            _authError.value = null
            val result = repository.signUp(email, pass, name)
            _isLoading.value = false
            result.onSuccess {
                onSuccess()
            }.onFailure {
                _authError.value = it.localizedMessage ?: "Sign up failed"
            }
        }
    }

    fun logout() {
        repository.setCurrentUser(null)
    }

    fun clearError() {
        _authError.value = null
    }
}

// -------------------------------------------------------------
// Attendance ViewModel
// -------------------------------------------------------------
class AttendanceViewModel(private val repository: HazriRepository) : ViewModel() {
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val displayFormat = SimpleDateFormat("EEEE, dd MMM yyyy", Locale.US)

    private val _selectedDate = MutableStateFlow(dateFormat.format(Date()))
    val selectedDate: StateFlow<String> = _selectedDate.asStateFlow()

    private val _selectedClassId = MutableStateFlow<String?>(null)
    val selectedClassId: StateFlow<String?> = _selectedClassId.asStateFlow()

    // Temporary modified statuses before saving: Map<studentId, Pair<statusId, note>>
    private val _pendingAttendance = MutableStateFlow<Map<String, Pair<String, String>>>(emptyMap())
    val pendingAttendance: StateFlow<Map<String, Pair<String, String>>> = _pendingAttendance.asStateFlow()

    private val _saveStatusMessage = MutableStateFlow<String?>(null)
    val saveStatusMessage: StateFlow<String?> = _saveStatusMessage.asStateFlow()

    fun getFormattedDate(): String {
        return try {
            val d = dateFormat.parse(_selectedDate.value) ?: Date()
            displayFormat.format(d)
        } catch (_: Exception) {
            _selectedDate.value
        }
    }

    fun selectDate(dateStr: String) {
        _selectedDate.value = dateStr
        _pendingAttendance.value = emptyMap()
    }

    fun shiftDate(days: Int) {
        try {
            val cal = Calendar.getInstance()
            val current = dateFormat.parse(_selectedDate.value) ?: Date()
            cal.time = current
            cal.add(Calendar.DAY_OF_YEAR, days)
            _selectedDate.value = dateFormat.format(cal.time)
            _pendingAttendance.value = emptyMap()
        } catch (_: Exception) {}
    }

    fun selectClass(classId: String) {
        _selectedClassId.value = classId
        _pendingAttendance.value = emptyMap()
    }

    fun setStudentStatus(studentId: String, statusId: String, note: String = "") {
        val current = _pendingAttendance.value.toMutableMap()
        val existingNote = current[studentId]?.second ?: note
        current[studentId] = Pair(statusId, existingNote)
        _pendingAttendance.value = current
    }

    fun setStudentNote(studentId: String, note: String) {
        val current = _pendingAttendance.value.toMutableMap()
        val existingStatus = current[studentId]?.first ?: ""
        current[studentId] = Pair(existingStatus, note)
        _pendingAttendance.value = current
    }

    fun markAllWithStatus(studentIds: List<String>, statusId: String) {
        val current = _pendingAttendance.value.toMutableMap()
        studentIds.forEach { sid ->
            val note = current[sid]?.second ?: ""
            current[sid] = Pair(statusId, note)
        }
        _pendingAttendance.value = current
    }

    fun saveAttendance(classId: String, studentIds: List<String>, defaultPresentStatusId: String) {
        viewModelScope.launch {
            val uid = repository.getEffectiveUserId() ?: return@launch
            val date = _selectedDate.value
            val currentPending = _pendingAttendance.value

            val records = studentIds.map { sid ->
                val (status, note) = currentPending[sid] ?: Pair(defaultPresentStatusId, "")
                AttendanceRecord(
                    id = "${sid}_$date",
                    userId = uid,
                    classId = classId,
                    studentId = sid,
                    date = date,
                    statusId = status.ifEmpty { defaultPresentStatusId },
                    note = note,
                    updatedAt = System.currentTimeMillis()
                )
            }

            repository.saveBatchAttendance(records)
            _saveStatusMessage.value = "Attendance saved successfully for ${records.size} students"
        }
    }

    fun clearSaveMessage() {
        _saveStatusMessage.value = null
    }

    fun openWhatsApp(
        context: Context,
        student: StudentEntity,
        className: String,
        statusText: String,
        template: String,
        appName: String
    ) {
        val url = repository.generateWhatsAppUrl(
            template = template,
            studentName = student.name,
            className = className,
            statusText = statusText,
            date = _selectedDate.value,
            appName = appName,
            parentPhone = student.parentPhone
        )
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(context, "Could not open WhatsApp: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}

// -------------------------------------------------------------
// Classes ViewModel
// -------------------------------------------------------------
class ClassesViewModel(private val repository: HazriRepository) : ViewModel() {
    fun getClassesFlow() = repository.getClasses(repository.getEffectiveUserId() ?: "")
    fun getAllClassesFlow() = repository.getAllClasses(repository.getEffectiveUserId() ?: "")

    fun createClass(name: String, section: String, desc: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            repository.createClass(name, section, desc)
            onSuccess()
        }
    }

    fun updateClass(classEntity: ClassEntity, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            repository.updateClass(classEntity)
            onSuccess()
        }
    }

    fun archiveClass(classId: String, archived: Boolean) {
        viewModelScope.launch {
            repository.archiveClass(classId, archived)
        }
    }

    fun deleteClass(classId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            repository.deleteClassAndCascade(classId)
            onSuccess()
        }
    }
}

// -------------------------------------------------------------
// Students ViewModel
// -------------------------------------------------------------
class StudentsViewModel(private val repository: HazriRepository) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedClassFilter = MutableStateFlow<String?>(null)
    val selectedClassFilter: StateFlow<String?> = _selectedClassFilter.asStateFlow()

    fun setSearchQuery(q: String) {
        _searchQuery.value = q
    }

    fun setClassFilter(cid: String?) {
        _selectedClassFilter.value = cid
    }

    fun addStudent(
        classId: String,
        name: String,
        roll: String,
        parentName: String,
        parentPhone: String,
        notes: String,
        onSuccess: () -> Unit = {}
    ) {
        viewModelScope.launch {
            repository.addStudent(classId, name, roll, parentName, parentPhone, notes)
            onSuccess()
        }
    }

    fun bulkAddStudents(classId: String, rawText: String, onDone: (Int) -> Unit) {
        viewModelScope.launch {
            val count = repository.bulkAddStudents(classId, rawText)
            onDone(count)
        }
    }

    fun updateStudent(student: StudentEntity, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            repository.updateStudent(student)
            onSuccess()
        }
    }

    fun archiveStudent(studentId: String, archived: Boolean) {
        viewModelScope.launch {
            repository.archiveStudent(studentId, archived)
        }
    }

    fun deleteStudent(studentId: String, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            repository.deleteStudent(studentId)
            onSuccess()
        }
    }
}

// -------------------------------------------------------------
// Reports ViewModel
// -------------------------------------------------------------
data class StudentAttendanceStat(
    val student: StudentEntity,
    val totalDays: Int,
    val presentDays: Int,
    val absentDays: Int,
    val lateDays: Int,
    val leaveDays: Int,
    val percentage: Float
)

class ReportsViewModel(private val repository: HazriRepository) : ViewModel() {
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    private val _selectedRangeType = MutableStateFlow("month") // "today", "week", "month", "all"
    val selectedRangeType: StateFlow<String> = _selectedRangeType.asStateFlow()

    private val _selectedClassId = MutableStateFlow<String?>(null)
    val selectedClassId: StateFlow<String?> = _selectedClassId.asStateFlow()

    fun setRangeType(type: String) {
        _selectedRangeType.value = type
    }

    fun setSelectedClass(classId: String?) {
        _selectedClassId.value = classId
    }

    fun getDateRange(): Pair<String, String> {
        val cal = Calendar.getInstance()
        val end = dateFormat.format(cal.time)
        val start = when (_selectedRangeType.value) {
            "today" -> end
            "week" -> {
                cal.add(Calendar.DAY_OF_YEAR, -7)
                dateFormat.format(cal.time)
            }
            "month" -> {
                cal.set(Calendar.DAY_OF_MONTH, 1)
                dateFormat.format(cal.time)
            }
            else -> "2020-01-01"
        }
        return Pair(start, end)
    }

    fun generateCsvContent(
        className: String,
        stats: List<StudentAttendanceStat>,
        dateRange: Pair<String, String>
    ): String {
        return buildString {
            appendLine("Hazri Book Attendance Report")
            appendLine("Class: $className")
            appendLine("Period: ${dateRange.first} to ${dateRange.second}")
            appendLine("Exported on: ${SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US).format(Date())}")
            appendLine()
            appendLine("Roll No,Student Name,Parent Name,Phone,Total Days,Present,Absent,Late,Leave,Attendance %")
            stats.forEach { s ->
                appendLine(
                    "\"${s.student.rollNumber}\",\"${s.student.name}\",\"${s.student.parentName}\",\"${s.student.parentPhone}\",${s.totalDays},${s.presentDays},${s.absentDays},${s.lateDays},${s.leaveDays},${"%.1f".format(s.percentage)}%"
                )
            }
        }
    }
}

// -------------------------------------------------------------
// Settings ViewModel
// -------------------------------------------------------------
class SettingsViewModel(private val repository: HazriRepository) : ViewModel() {
    fun getUserSettingsFlow() = repository.getUserSettings(repository.getEffectiveUserId() ?: "")
    fun getStatusTypesFlow() = repository.getStatusTypes(repository.getEffectiveUserId() ?: "")

    fun updateUserSettings(settings: UserSettings) {
        viewModelScope.launch {
            repository.updateUserSettings(settings)
        }
    }

    fun addCustomStatus(nameEn: String, nameUr: String, colorHex: String, isPresent: Boolean) {
        viewModelScope.launch {
            repository.addCustomStatusType(nameEn, nameUr, colorHex, isPresent)
        }
    }

    fun updateStatusType(statusType: AttendanceStatusType) {
        viewModelScope.launch {
            repository.updateStatusType(statusType)
        }
    }

    fun deleteStatusType(statusId: String, onResult: (String?) -> Unit) {
        viewModelScope.launch {
            val result = repository.deleteStatusType(statusId)
            result.onSuccess { onResult(null) }
                .onFailure { onResult(it.message) }
        }
    }
}

// -------------------------------------------------------------
// Admin ViewModel
// -------------------------------------------------------------
class AdminViewModel(private val repository: HazriRepository) : ViewModel() {
    val usersList = repository.getAllUsers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val inspectingUserId = repository.inspectingUserId

    fun setUserBlocked(userId: String, isBlocked: Boolean) {
        viewModelScope.launch {
            repository.setUserBlocked(userId, isBlocked)
        }
    }

    fun setUserRole(userId: String, role: String) {
        viewModelScope.launch {
            repository.setUserRole(userId, role)
        }
    }

    fun inspectUser(userId: String?) {
        repository.setInspectingUser(userId)
    }

    fun getGlobalSettingsFlow() = repository.getGlobalSettings()

    fun updateGlobalSettings(settings: GlobalSettings) {
        viewModelScope.launch {
            repository.updateGlobalSettings(settings)
        }
    }
}

// -------------------------------------------------------------
// AI Advisor ViewModel (High Thinking with gemini-4-carbon)
// -------------------------------------------------------------
class AiAdvisorViewModel(
    private val repository: HazriRepository,
    private val aiAdvisor: AiAttendanceAdvisor
) : ViewModel() {
    private val _uiState = MutableStateFlow<AiAdvisorUiState>(AiAdvisorUiState.Idle)
    val uiState: StateFlow<AiAdvisorUiState> = _uiState.asStateFlow()

    private val _isDeepThinkingEnabled = MutableStateFlow(true)
    val isDeepThinkingEnabled: StateFlow<Boolean> = _isDeepThinkingEnabled.asStateFlow()

    fun setDeepThinking(enabled: Boolean) {
        _isDeepThinkingEnabled.value = enabled
    }

    fun queryAdvisor(query: String, contextSummary: String) {
        viewModelScope.launch {
            aiAdvisor.analyzeAttendance(
                contextSummary = contextSummary,
                userQuery = query,
                enableDeepThinking = _isDeepThinkingEnabled.value
            ).collect { state ->
                _uiState.value = state
            }
        }
    }

    fun resetState() {
        _uiState.value = AiAdvisorUiState.Idle
    }
}
