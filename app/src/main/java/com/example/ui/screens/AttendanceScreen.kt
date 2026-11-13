package com.example.ui.screens

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.NoteAlt
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AttendanceRecord
import com.example.data.model.AttendanceStatusType
import com.example.data.model.ClassEntity
import com.example.data.model.StudentEntity
import com.example.data.model.UserSettings
import com.example.ui.components.EmptyStateView
import com.example.ui.components.StatCard
import com.example.ui.theme.GoldAccent
import com.example.ui.theme.StatusAbsent
import com.example.ui.theme.StatusLate
import com.example.ui.theme.StatusLeave
import com.example.ui.theme.StatusPresent
import com.example.ui.theme.parseHexColor
import com.example.ui.viewmodel.AttendanceViewModel
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(
    viewModel: AttendanceViewModel,
    classes: List<ClassEntity>,
    students: List<StudentEntity>,
    existingAttendance: List<AttendanceRecord>,
    statusTypes: List<AttendanceStatusType>,
    userSettings: UserSettings?,
    isReadOnly: Boolean = false,
    onNavigateToClasses: () -> Unit
) {
    val lang = LocalAppLanguage.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val selectedDate by viewModel.selectedDate.collectAsState()
    val selectedClassId by viewModel.selectedClassId.collectAsState()
    val pendingAttendance by viewModel.pendingAttendance.collectAsState()
    val saveMessage by viewModel.saveStatusMessage.collectAsState()

    // Default to first active class if none selected
    LaunchedEffect(classes) {
        if (selectedClassId == null && classes.isNotEmpty()) {
            viewModel.selectClass(classes.first().id)
        }
    }

    LaunchedEffect(saveMessage) {
        saveMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearSaveMessage()
        }
    }

    val currentClass = classes.find { it.id == selectedClassId }
    val filteredStudents = students.filter { it.classId == selectedClassId && !it.isArchived }

    // Dialog for editing student note
    var studentForNote by remember { mutableStateOf<StudentEntity?>(null) }
    var currentNoteText by remember { mutableStateOf("") }

    // Dialog for WhatsApp preview
    var whatsappStudentTarget by remember { mutableStateOf<StudentEntity?>(null) }
    var whatsappStatusText by remember { mutableStateOf("") }

    val defaultPresentType = statusTypes.find { it.code == AttendanceStatusType.CODE_PRESENT }
        ?: statusTypes.firstOrNull()
    val defaultPresentId = defaultPresentType?.id ?: ""

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            if (!isReadOnly && filteredStudents.isNotEmpty() && currentClass != null) {
                FloatingActionButton(
                    onClick = {
                        viewModel.saveAttendance(
                            classId = currentClass.id,
                            studentIds = filteredStudents.map { it.id },
                            defaultPresentStatusId = defaultPresentId
                        )
                    },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    modifier = Modifier.testTag("save_attendance_fab")
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Save, contentDescription = "Save")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(AppStrings.get("save_attendance", lang), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Class Selector Chips Row
            if (classes.isNotEmpty()) {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(classes) { cls ->
                        FilterChip(
                            selected = cls.id == selectedClassId,
                            onClick = { viewModel.selectClass(cls.id) },
                            label = { Text(cls.name, fontWeight = FontWeight.Medium) },
                            leadingIcon = if (cls.id == selectedClassId) {
                                { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            } else null,
                            modifier = Modifier.testTag("class_chip_${cls.id}")
                        )
                    }
                }
            }

            // Date Navigation Row
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(
                        onClick = { viewModel.shiftDate(-1) },
                        modifier = Modifier.testTag("prev_date_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Previous Day")
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = "Date",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = viewModel.getFormattedDate(),
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }

                    IconButton(
                        onClick = { viewModel.shiftDate(1) },
                        modifier = Modifier.testTag("next_date_button")
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = "Next Day")
                    }
                }
            }

            // Quick Mark Action Row & Summary Counter
            if (filteredStudents.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "${filteredStudents.size} ${AppStrings.get("students", lang)}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    if (!isReadOnly) {
                        OutlinedButton(
                            onClick = {
                                viewModel.markAllWithStatus(
                                    studentIds = filteredStudents.map { it.id },
                                    statusId = defaultPresentId
                                )
                            },
                            shape = RoundedCornerShape(20.dp),
                            modifier = Modifier.testTag("mark_all_present_btn")
                        ) {
                            Icon(Icons.Default.DoneAll, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(AppStrings.get("mark_all_present", lang), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Main Student Attendance List
            if (classes.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.School,
                    title = "No Classes Found",
                    description = "Create your first class to start taking attendance.",
                    actionButtonText = AppStrings.get("add_class", lang),
                    onActionClick = onNavigateToClasses
                )
            } else if (filteredStudents.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.Person,
                    title = "No Students in this Class",
                    description = "Add students to ${currentClass?.name ?: "this class"} to begin marking Hazri.",
                    actionButtonText = AppStrings.get("add_student", lang),
                    onActionClick = onNavigateToClasses
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredStudents, key = { it.id }) { student ->
                        // Resolve current assigned status
                        val existingRec = existingAttendance.find { it.studentId == student.id }
                        val pending = pendingAttendance[student.id]

                        val currentStatusId = pending?.first
                            ?: existingRec?.statusId
                            ?: defaultPresentId

                        val currentNote = pending?.second
                            ?: existingRec?.note
                            ?: ""

                        val activeStatus = statusTypes.find { it.id == currentStatusId }

                        AttendanceStudentCard(
                            student = student,
                            statusTypes = statusTypes,
                            selectedStatusId = currentStatusId,
                            note = currentNote,
                            isReadOnly = isReadOnly,
                            onStatusSelected = { stId ->
                                viewModel.setStudentStatus(student.id, stId, currentNote)
                            },
                            onEditNote = {
                                studentForNote = student
                                currentNoteText = currentNote
                            },
                            onWhatsAppClick = {
                                val statusLabel = if (lang == "ur") activeStatus?.nameUr ?: "غیر حاضر" else activeStatus?.nameEn ?: "Absent"
                                whatsappStudentTarget = student
                                whatsappStatusText = statusLabel
                            }
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(72.dp))
                    }
                }
            }
        }
    }

    // Dialog for Adding/Editing Daily Student Note
    if (studentForNote != null) {
        AlertDialog(
            onDismissRequest = { studentForNote = null },
            title = { Text("Note for ${studentForNote?.name}") },
            text = {
                OutlinedTextField(
                    value = currentNoteText,
                    onValueChange = { currentNoteText = it },
                    label = { Text("Daily Note / Reason") },
                    placeholder = { Text("e.g. Fever, Doctor appointment, Arrived 15m late") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        studentForNote?.let { s ->
                            viewModel.setStudentNote(s.id, currentNoteText)
                        }
                        studentForNote = null
                    }
                ) {
                    Text("Save Note")
                }
            },
            dismissButton = {
                TextButton(onClick = { studentForNote = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // WhatsApp Message Confirmation Dialog
    if (whatsappStudentTarget != null && currentClass != null) {
        val student = whatsappStudentTarget!!
        val template = userSettings?.whatsappTemplate
            ?: "Dear Parent, your child {student_name} of class {class_name} was marked {status} on {date}. Regards, {app_name}"
        val preview = template
            .replace("{student_name}", student.name)
            .replace("{class_name}", currentClass.name)
            .replace("{status}", whatsappStatusText)
            .replace("{date}", selectedDate)
            .replace("{app_name}", userSettings?.appDisplayName ?: "Hazri Book")

        AlertDialog(
            onDismissRequest = { whatsappStudentTarget = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = "WhatsApp",
                        tint = parseHexColor("#25D366")
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(AppStrings.get("whatsapp_parent", lang))
                }
            },
            text = {
                Column {
                    Text(
                        text = "Recipient: ${student.parentName.ifEmpty { "Parent" }} (${student.parentPhone.ifEmpty { "No phone saved" }})",
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = preview,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.openWhatsApp(
                            context = context,
                            student = student,
                            className = currentClass.name,
                            statusText = whatsappStatusText,
                            template = template,
                            appName = userSettings?.appDisplayName ?: "Hazri Book"
                        )
                        whatsappStudentTarget = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = parseHexColor("#25D366")
                    )
                ) {
                    Text("Open WhatsApp", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { whatsappStudentTarget = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun AttendanceStudentCard(
    student: StudentEntity,
    statusTypes: List<AttendanceStatusType>,
    selectedStatusId: String,
    note: String,
    isReadOnly: Boolean,
    onStatusSelected: (String) -> Unit,
    onEditNote: () -> Unit,
    onWhatsAppClick: () -> Unit
) {
    val lang = LocalAppLanguage.current

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .testTag("student_card_${student.id}"),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Student Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (student.rollNumber.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer)
                                .padding(horizontal = 8.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = student.rollNumber,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                    }

                    Column {
                        Text(
                            text = student.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (student.parentName.isNotBlank() || student.parentPhone.isNotBlank()) {
                            Text(
                                text = "${student.parentName} • ${student.parentPhone}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }

                // WhatsApp action button for quick notification
                IconButton(
                    onClick = onWhatsAppClick,
                    modifier = Modifier.testTag("whatsapp_btn_${student.id}")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Chat,
                        contentDescription = "WhatsApp",
                        tint = parseHexColor("#25D366"),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            // Note display if any
            if (note.isNotBlank()) {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.NoteAlt,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = note,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Status Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                statusTypes.forEach { st ->
                    val isSelected = st.id == selectedStatusId
                    val color = parseHexColor(st.colorHex)
                    val label = if (lang == "ur") st.nameUr else st.nameEn

                    Surface(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(enabled = !isReadOnly) { onStatusSelected(st.id) }
                            .testTag("status_btn_${student.id}_${st.code}"),
                        color = if (isSelected) color else color.copy(alpha = 0.12f),
                        border = if (isSelected) null else androidx.compose.foundation.BorderStroke(1.dp, color.copy(alpha = 0.25f)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Box(
                            modifier = Modifier.padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                color = if (isSelected) Color.White else color,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                            )
                        }
                    }
                }

                // Note icon button
                IconButton(
                    onClick = onEditNote,
                    modifier = Modifier
                        .size(36.dp)
                        .testTag("note_btn_${student.id}")
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Edit Note",
                        tint = if (note.isNotBlank()) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}
