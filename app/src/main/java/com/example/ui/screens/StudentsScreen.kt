package com.example.ui.screens

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.GroupAdd
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Unarchive
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import com.example.data.model.ClassEntity
import com.example.data.model.StudentEntity
import com.example.ui.components.EmptyStateView
import com.example.ui.theme.parseHexColor
import com.example.ui.viewmodel.StudentsViewModel
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsScreen(
    viewModel: StudentsViewModel,
    classes: List<ClassEntity>,
    students: List<StudentEntity>,
    isReadOnly: Boolean = false,
    onNavigateToClasses: () -> Unit
) {
    val lang = LocalAppLanguage.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val searchQuery by viewModel.searchQuery.collectAsState()
    val selectedClassFilter by viewModel.selectedClassFilter.collectAsState()

    var showAddDialog by remember { mutableStateOf(false) }
    var showBulkDialog by remember { mutableStateOf(false) }
    var studentToEdit by remember { mutableStateOf<StudentEntity?>(null) }
    var studentToDelete by remember { mutableStateOf<StudentEntity?>(null) }

    // Filter students
    val filteredStudents = students.filter { s ->
        val matchesClass = selectedClassFilter == null || s.classId == selectedClassFilter
        val matchesSearch = searchQuery.isBlank() ||
                s.name.contains(searchQuery, ignoreCase = true) ||
                s.rollNumber.contains(searchQuery, ignoreCase = true) ||
                s.parentName.contains(searchQuery, ignoreCase = true)
        matchesClass && matchesSearch
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            if (!isReadOnly && classes.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FloatingActionButton(
                        onClick = { showBulkDialog = true },
                        containerColor = MaterialTheme.colorScheme.secondaryContainer,
                        contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
                        modifier = Modifier.testTag("bulk_add_fab")
                    ) {
                        Icon(Icons.Default.GroupAdd, contentDescription = "Bulk Add")
                    }

                    FloatingActionButton(
                        onClick = { showAddDialog = true },
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = Color.White,
                        modifier = Modifier.testTag("add_student_fab")
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Add Student")
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
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                placeholder = { Text(AppStrings.get("search_students", lang)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { viewModel.setSearchQuery("") }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            // Class Filter Chips
            if (classes.isNotEmpty()) {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    item {
                        FilterChip(
                            selected = selectedClassFilter == null,
                            onClick = { viewModel.setClassFilter(null) },
                            label = { Text("All Classes (${students.size})") }
                        )
                    }

                    items(classes) { cls ->
                        val count = students.count { it.classId == cls.id }
                        FilterChip(
                            selected = selectedClassFilter == cls.id,
                            onClick = { viewModel.setClassFilter(cls.id) },
                            label = { Text("${cls.name} ($count)") }
                        )
                    }
                }
            }

            // Student List
            if (classes.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.Person,
                    title = "No Classes Available",
                    description = "Please create at least one class before adding students.",
                    actionButtonText = AppStrings.get("add_class", lang),
                    onActionClick = onNavigateToClasses
                )
            } else if (filteredStudents.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.Person,
                    title = "No Students Found",
                    description = if (searchQuery.isNotEmpty()) "No results matching \"$searchQuery\"." else "Tap + to add your first student to this class.",
                    actionButtonText = if (searchQuery.isEmpty() && !isReadOnly) AppStrings.get("add_student", lang) else "",
                    onActionClick = { showAddDialog = true }
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredStudents, key = { it.id }) { student ->
                        val studentClass = classes.find { it.id == student.classId }
                        StudentDirectoryCard(
                            student = student,
                            className = studentClass?.name ?: "Unknown Class",
                            isReadOnly = isReadOnly,
                            onEdit = { studentToEdit = student },
                            onToggleArchive = {
                                viewModel.archiveStudent(student.id, !student.isArchived)
                            },
                            onDelete = { studentToDelete = student },
                            onWhatsAppClick = {
                                val cleanPhone = student.parentPhone.replace(Regex("[^0-9]"), "")
                                if (cleanPhone.isNotEmpty()) {
                                    val url = "https://wa.me/$cleanPhone"
                                    try {
                                        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                                    } catch (_: Exception) {
                                        Toast.makeText(context, "Could not launch WhatsApp", Toast.LENGTH_SHORT).show()
                                    }
                                } else {
                                    Toast.makeText(context, "No parent phone number saved", Toast.LENGTH_SHORT).show()
                                }
                            }
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }

    // Add / Edit Student Dialog
    if (showAddDialog || studentToEdit != null) {
        val editing = studentToEdit
        var name by remember(editing) { mutableStateOf(editing?.name ?: "") }
        var roll by remember(editing) { mutableStateOf(editing?.rollNumber ?: "") }
        var selectedClassId by remember(editing) {
            mutableStateOf(editing?.classId ?: selectedClassFilter ?: classes.firstOrNull()?.id ?: "")
        }
        var parentName by remember(editing) { mutableStateOf(editing?.parentName ?: "") }
        var parentPhone by remember(editing) { mutableStateOf(editing?.parentPhone ?: "") }
        var notes by remember(editing) { mutableStateOf(editing?.notes ?: "") }

        var classDropdownExpanded by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = {
                showAddDialog = false
                studentToEdit = null
            },
            title = { Text(if (editing == null) AppStrings.get("add_student", lang) else "Edit Student") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Class Picker Dropdown
                    ExposedDropdownMenuBox(
                        expanded = classDropdownExpanded,
                        onExpandedChange = { classDropdownExpanded = it }
                    ) {
                        val currentClassName = classes.find { it.id == selectedClassId }?.name ?: "Select Class"
                        OutlinedTextField(
                            value = currentClassName,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Class *") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = classDropdownExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = classDropdownExpanded,
                            onDismissRequest = { classDropdownExpanded = false }
                        ) {
                            classes.forEach { cls ->
                                DropdownMenuItem(
                                    text = { Text(cls.name) },
                                    onClick = {
                                        selectedClassId = cls.id
                                        classDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Student Name *") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("student_name_input")
                    )

                    OutlinedTextField(
                        value = roll,
                        onValueChange = { roll = it },
                        label = { Text("Roll Number") },
                        placeholder = { Text("e.g. 101, 12") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = parentName,
                        onValueChange = { parentName = it },
                        label = { Text("Parent / Guardian Name") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = parentPhone,
                        onValueChange = { parentPhone = it },
                        label = { Text("WhatsApp Phone (with Country Code)") },
                        placeholder = { Text("e.g. 923001234567") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Notes (Medical, Bus, Remarks)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank() && selectedClassId.isNotBlank()) {
                            if (editing == null) {
                                viewModel.addStudent(
                                    classId = selectedClassId,
                                    name = name,
                                    roll = roll,
                                    parentName = parentName,
                                    parentPhone = parentPhone,
                                    notes = notes
                                )
                            } else {
                                viewModel.updateStudent(
                                    editing.copy(
                                        classId = selectedClassId,
                                        name = name,
                                        rollNumber = roll,
                                        parentName = parentName,
                                        parentPhone = parentPhone,
                                        notes = notes
                                    )
                                )
                            }
                            showAddDialog = false
                            studentToEdit = null
                        }
                    },
                    modifier = Modifier.testTag("save_student_btn")
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddDialog = false
                    studentToEdit = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Bulk Add Students Dialog (as per PRD 4.3)
    if (showBulkDialog) {
        var bulkText by remember { mutableStateOf("") }
        var targetClassId by remember {
            mutableStateOf(selectedClassFilter ?: classes.firstOrNull()?.id ?: "")
        }
        var classDropdownExpanded by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { showBulkDialog = false },
            title = { Text(AppStrings.get("bulk_add", lang)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Paste multiple students, one per line.\nFormat: \"Name\" OR \"Roll, Name, Phone\"",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Target Class
                    ExposedDropdownMenuBox(
                        expanded = classDropdownExpanded,
                        onExpandedChange = { classDropdownExpanded = it }
                    ) {
                        val currentClassName = classes.find { it.id == targetClassId }?.name ?: "Select Class"
                        OutlinedTextField(
                            value = currentClassName,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Assign to Class") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = classDropdownExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable)
                        )
                        ExposedDropdownMenu(
                            expanded = classDropdownExpanded,
                            onDismissRequest = { classDropdownExpanded = false }
                        ) {
                            classes.forEach { cls ->
                                DropdownMenuItem(
                                    text = { Text(cls.name) },
                                    onClick = {
                                        targetClassId = cls.id
                                        classDropdownExpanded = false
                                    }
                                )
                            }
                        }
                    }

                    OutlinedTextField(
                        value = bulkText,
                        onValueChange = { bulkText = it },
                        placeholder = {
                            Text("101, Abdullah Tariq, 923001234567\n102, Mariam Bibi, 923007654321\nZaid Khan")
                        },
                        minLines = 6,
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("bulk_add_textarea")
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (bulkText.isNotBlank() && targetClassId.isNotBlank()) {
                            viewModel.bulkAddStudents(targetClassId, bulkText) { count ->
                                scope.launch {
                                    snackbarHostState.showSnackbar("Added $count students successfully")
                                }
                            }
                            showBulkDialog = false
                        }
                    },
                    modifier = Modifier.testTag("confirm_bulk_add_btn")
                ) {
                    Text("Add Students")
                }
            },
            dismissButton = {
                TextButton(onClick = { showBulkDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Student Dialog
    if (studentToDelete != null) {
        val s = studentToDelete!!
        AlertDialog(
            onDismissRequest = { studentToDelete = null },
            title = { Text("Delete Student?") },
            text = {
                Text("Are you sure you want to delete ${s.name}? All past attendance records for this student will also be removed.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteStudent(s.id)
                        studentToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                TextButton(onClick = { studentToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
fun StudentDirectoryCard(
    student: StudentEntity,
    className: String,
    isReadOnly: Boolean,
    onEdit: () -> Unit,
    onToggleArchive: () -> Unit,
    onDelete: () -> Unit,
    onWhatsAppClick: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (student.isArchived) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f) else MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (student.rollNumber.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer)
                                .padding(horizontal = 7.dp, vertical = 2.dp)
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

                    Text(
                        text = student.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (student.isArchived) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "Archived",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(2.dp))

                Text(
                    text = "$className ${if (student.parentName.isNotBlank()) "• Parent: ${student.parentName}" else ""}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                if (student.parentPhone.isNotBlank()) {
                    Text(
                        text = "Phone: ${student.parentPhone}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (student.parentPhone.isNotBlank()) {
                    IconButton(onClick = onWhatsAppClick) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.Chat,
                            contentDescription = "WhatsApp",
                            tint = parseHexColor("#25D366")
                        )
                    }
                }

                if (!isReadOnly) {
                    Box {
                        IconButton(onClick = { menuExpanded = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Options")
                        }

                        DropdownMenu(
                            expanded = menuExpanded,
                            onDismissRequest = { menuExpanded = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                                onClick = {
                                    menuExpanded = false
                                    onEdit()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text(if (student.isArchived) "Unarchive" else "Archive") },
                                leadingIcon = {
                                    Icon(
                                        if (student.isArchived) Icons.Default.Unarchive else Icons.Default.Archive,
                                        contentDescription = null
                                    )
                                },
                                onClick = {
                                    menuExpanded = false
                                    onToggleArchive()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                },
                                onClick = {
                                    menuExpanded = false
                                    onDelete()
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
