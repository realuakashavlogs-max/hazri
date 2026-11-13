package com.example.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Unarchive
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ClassEntity
import com.example.data.model.StudentEntity
import com.example.ui.components.EmptyStateView
import com.example.ui.viewmodel.ClassesViewModel
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage

@Composable
fun ClassesScreen(
    viewModel: ClassesViewModel,
    allClasses: List<ClassEntity>,
    students: List<StudentEntity>,
    isReadOnly: Boolean = false,
    onSelectClassToMark: (String) -> Unit
) {
    val lang = LocalAppLanguage.current
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Active, 1: Archived

    var showAddDialog by remember { mutableStateOf(false) }
    var classToEdit by remember { mutableStateOf<ClassEntity?>(null) }
    var classToDelete by remember { mutableStateOf<ClassEntity?>(null) }

    val activeClasses = allClasses.filter { !it.isArchived }
    val archivedClasses = allClasses.filter { it.isArchived }
    val displayedClasses = if (selectedTab == 0) activeClasses else archivedClasses

    Scaffold(
        floatingActionButton = {
            if (!isReadOnly) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = Color.White,
                    modifier = Modifier.testTag("add_class_fab")
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Class")
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tabs: Active vs Archived
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surface
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Active (${activeClasses.size})", fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Archived (${archivedClasses.size})", fontWeight = FontWeight.Bold) }
                )
            }

            if (displayedClasses.isEmpty()) {
                EmptyStateView(
                    icon = Icons.Default.School,
                    title = if (selectedTab == 0) "No Active Classes" else "No Archived Classes",
                    description = if (selectedTab == 0) "Tap + below to create a new class (e.g. Class 5, Hifz Batch)." else "Archived classes will appear here.",
                    actionButtonText = if (selectedTab == 0 && !isReadOnly) AppStrings.get("add_class", lang) else "",
                    onActionClick = { showAddDialog = true }
                )
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(displayedClasses, key = { it.id }) { cls ->
                        val count = students.count { it.classId == cls.id && !it.isArchived }
                        ClassCardItem(
                            classEntity = cls,
                            studentCount = count,
                            isReadOnly = isReadOnly,
                            onMarkAttendance = { onSelectClassToMark(cls.id) },
                            onEdit = { classToEdit = cls },
                            onToggleArchive = {
                                viewModel.archiveClass(cls.id, !cls.isArchived)
                            },
                            onDelete = { classToDelete = cls }
                        )
                    }

                    item {
                        Spacer(modifier = Modifier.height(72.dp))
                    }
                }
            }
        }
    }

    // Add / Edit Dialog
    if (showAddDialog || classToEdit != null) {
        val editing = classToEdit
        var name by remember(editing) { mutableStateOf(editing?.name ?: "") }
        var section by remember(editing) { mutableStateOf(editing?.section ?: "") }
        var desc by remember(editing) { mutableStateOf(editing?.description ?: "") }

        AlertDialog(
            onDismissRequest = {
                showAddDialog = false
                classToEdit = null
            },
            title = { Text(if (editing == null) AppStrings.get("add_class", lang) else "Edit Class") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Class Name *") },
                        placeholder = { Text("e.g. Class 7, Tajweed Batch") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("class_name_input")
                    )

                    OutlinedTextField(
                        value = section,
                        onValueChange = { section = it },
                        label = { Text("Section / Room") },
                        placeholder = { Text("e.g. Section A, Morning") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = desc,
                        onValueChange = { desc = it },
                        label = { Text("Description") },
                        placeholder = { Text("Optional description") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            if (editing == null) {
                                viewModel.createClass(name, section, desc)
                            } else {
                                viewModel.updateClass(
                                    editing.copy(name = name, section = section, description = desc)
                                )
                            }
                            showAddDialog = false
                            classToEdit = null
                        }
                    },
                    modifier = Modifier.testTag("save_class_btn")
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddDialog = false
                    classToEdit = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Delete Confirmation Dialog (Recommends Archive First as per PRD rule 3)
    if (classToDelete != null) {
        val cls = classToDelete!!
        val studentCount = students.count { it.classId == cls.id }

        AlertDialog(
            onDismissRequest = { classToDelete = null },
            title = { Text("Delete Class \"${cls.name}\"?") },
            text = {
                Column {
                    Text(
                        "Deleting this class will permanently erase its $studentCount students and all their attendance history. This action cannot be undone.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Recommendation: Archive this class instead to preserve records while hiding it from daily marking.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.deleteClass(cls.id)
                        classToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete Permanently")
                }
            },
            dismissButton = {
                Row {
                    OutlinedButton(
                        onClick = {
                            viewModel.archiveClass(cls.id, true)
                            classToDelete = null
                        }
                    ) {
                        Text("Archive Instead")
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    TextButton(onClick = { classToDelete = null }) {
                        Text("Cancel")
                    }
                }
            }
        )
    }
}

@Composable
fun ClassCardItem(
    classEntity: ClassEntity,
    studentCount: Int,
    isReadOnly: Boolean,
    onMarkAttendance: () -> Unit,
    onEdit: () -> Unit,
    onToggleArchive: () -> Unit,
    onDelete: () -> Unit
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = classEntity.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (classEntity.section.isNotBlank()) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.secondaryContainer)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = classEntity.section,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }

                if (classEntity.description.isNotBlank()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = classEntity.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = "$studentCount Students Enrolled",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                if (!classEntity.isArchived) {
                    Button(
                        onClick = onMarkAttendance,
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.padding(end = 4.dp)
                    ) {
                        Text("Mark Hazri", fontSize = 12.sp)
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
                                text = { Text(if (classEntity.isArchived) "Unarchive" else "Archive") },
                                leadingIcon = {
                                    Icon(
                                        if (classEntity.isArchived) Icons.Default.Unarchive else Icons.Default.Archive,
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
