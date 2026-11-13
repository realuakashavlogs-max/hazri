package com.example.ui.screens

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.Print
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.example.ui.components.EmptyStateView
import com.example.ui.components.StatCard
import com.example.ui.theme.StatusAbsent
import com.example.ui.theme.StatusLate
import com.example.ui.theme.StatusLeave
import com.example.ui.theme.StatusPresent
import com.example.ui.viewmodel.ReportsViewModel
import com.example.ui.viewmodel.StudentAttendanceStat
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage

@Composable
fun ReportsScreen(
    viewModel: ReportsViewModel,
    classes: List<ClassEntity>,
    students: List<StudentEntity>,
    attendanceRecords: List<AttendanceRecord>,
    statusTypes: List<AttendanceStatusType>
) {
    val lang = LocalAppLanguage.current
    val context = LocalContext.current

    val selectedClassId by viewModel.selectedClassId.collectAsState()
    val selectedRangeType by viewModel.selectedRangeType.collectAsState()

    var showPrintPreview by remember { mutableStateOf(false) }

    // Default to first class if not set
    LaunchedEffect(classes) {
        if (selectedClassId == null && classes.isNotEmpty()) {
            viewModel.setSelectedClass(classes.first().id)
        }
    }

    val currentClass = classes.find { it.id == selectedClassId }
    val classStudents = students.filter { it.classId == selectedClassId && !it.isArchived }

    val dateRange = viewModel.getDateRange()
    val filteredRecords = attendanceRecords.filter { rec ->
        rec.classId == selectedClassId && rec.date >= dateRange.first && rec.date <= dateRange.second
    }

    // Build per-student stats
    val presentStatusIds = statusTypes.filter { it.isPresentCount }.map { it.id }.toSet()
    val absentType = statusTypes.find { it.code == AttendanceStatusType.CODE_ABSENT }
    val lateType = statusTypes.find { it.code == AttendanceStatusType.CODE_LATE }
    val leaveType = statusTypes.find { it.code == AttendanceStatusType.CODE_LEAVE }

    val studentStats = classStudents.map { student ->
        val recs = filteredRecords.filter { it.studentId == student.id }
        val total = recs.size
        val presentCount = recs.count { it.statusId in presentStatusIds }
        val absentCount = recs.count { it.statusId == absentType?.id }
        val lateCount = recs.count { it.statusId == lateType?.id }
        val leaveCount = recs.count { it.statusId == leaveType?.id }
        val pct = if (total > 0) (presentCount.toFloat() / total) * 100f else 100f

        StudentAttendanceStat(
            student = student,
            totalDays = total,
            presentDays = presentCount,
            absentDays = absentCount,
            lateDays = lateCount,
            leaveDays = leaveCount,
            percentage = pct
        )
    }

    // Aggregates
    val totalRecordsCount = filteredRecords.size
    val totalPresents = filteredRecords.count { it.statusId in presentStatusIds }
    val totalAbsents = filteredRecords.count { it.statusId == absentType?.id }
    val overallPercentage = if (totalRecordsCount > 0) {
        (totalPresents.toFloat() / totalRecordsCount) * 100f
    } else 0f

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Class Selector Row
        if (classes.isNotEmpty()) {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(classes) { cls ->
                    FilterChip(
                        selected = cls.id == selectedClassId,
                        onClick = { viewModel.setSelectedClass(cls.id) },
                        label = { Text(cls.name) }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Time Range Chips Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            listOf(
                Pair("today", "Today"),
                Pair("week", "Last 7 Days"),
                Pair("month", "This Month"),
                Pair("all", "All Time")
            ).forEach { (key, label) ->
                FilterChip(
                    selected = selectedRangeType == key,
                    onClick = { viewModel.setRangeType(key) },
                    label = { Text(label, fontSize = 12.sp) }
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Overall Stats Summary Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            StatCard(
                title = AppStrings.get("attendance_rate", lang),
                value = if (totalRecordsCount > 0) "%.1f%%".format(overallPercentage) else "N/A",
                color = if (overallPercentage >= 80f) StatusPresent else StatusLate,
                modifier = Modifier.weight(1f)
            )

            StatCard(
                title = AppStrings.get("present", lang),
                value = "$totalPresents",
                color = StatusPresent,
                modifier = Modifier.weight(1f)
            )

            StatCard(
                title = AppStrings.get("absent", lang),
                value = "$totalAbsents",
                color = StatusAbsent,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Export & Print Actions Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "${classStudents.size} Students in ${currentClass?.name ?: ""}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                OutlinedButton(
                    onClick = { showPrintPreview = true },
                    modifier = Modifier.testTag("print_preview_btn")
                ) {
                    Icon(Icons.Default.Print, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(AppStrings.get("print_report", lang), fontSize = 12.sp)
                }

                Button(
                    onClick = {
                        val csv = viewModel.generateCsvContent(
                            className = currentClass?.name ?: "Class",
                            stats = studentStats,
                            dateRange = dateRange
                        )
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/csv"
                            putExtra(Intent.EXTRA_SUBJECT, "Hazri Book - ${currentClass?.name} Report")
                            putExtra(Intent.EXTRA_TEXT, csv)
                        }
                        context.startActivity(Intent.createChooser(intent, "Share Attendance CSV"))
                    },
                    modifier = Modifier.testTag("export_csv_btn")
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(AppStrings.get("export_csv", lang), fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Per Student Breakdown List
        if (studentStats.isEmpty()) {
            EmptyStateView(
                icon = Icons.Default.Assessment,
                title = "No Attendance Records Yet",
                description = "Attendance records for this class and date range will appear here."
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(studentStats, key = { it.student.id }) { stat ->
                    StudentReportCard(stat)
                }
            }
        }
    }

    // Print / PDF Formatted Report Preview Dialog
    if (showPrintPreview) {
        AlertDialog(
            onDismissRequest = { showPrintPreview = false },
            title = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Print-Friendly Report", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(
                                text = "Class: ${currentClass?.name ?: ""}",
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "Period: ${dateRange.first} to ${dateRange.second}",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "Overall Attendance Rate: ${"%.1f".format(overallPercentage)}%",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(280.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(studentStats) { s ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "${s.student.rollNumber.ifEmpty { "-" }} • ${s.student.name}",
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 13.sp
                                    )
                                    Text(
                                        text = "Present: ${s.presentDays} | Absent: ${s.absentDays} | Late: ${s.lateDays}",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.outline
                                    )
                                }

                                Text(
                                    text = "${"%.0f".format(s.percentage)}%",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (s.percentage >= 80f) StatusPresent else StatusAbsent
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val reportText = buildString {
                            appendLine("HAZRI BOOK OFFICIAL REPORT")
                            appendLine("Class: ${currentClass?.name}")
                            appendLine("Period: ${dateRange.first} to ${dateRange.second}")
                            appendLine("Overall Rate: ${"%.1f".format(overallPercentage)}%")
                            appendLine("-----------------------------------")
                            studentStats.forEach { s ->
                                appendLine("${s.student.rollNumber.padEnd(5)} ${s.student.name.padEnd(20)} ${"%.0f".format(s.percentage)}% (P:${s.presentDays} A:${s.absentDays})")
                            }
                        }
                        val shareIntent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, reportText)
                        }
                        context.startActivity(Intent.createChooser(shareIntent, "Print / Share Report"))
                        showPrintPreview = false
                    }
                ) {
                    Text("Share / Print Summary")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPrintPreview = false }) {
                    Text("Close")
                }
            }
        )
    }
}

@Composable
fun StudentReportCard(stat: StudentAttendanceStat) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (stat.student.rollNumber.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(MaterialTheme.colorScheme.primaryContainer)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = stat.student.rollNumber,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.width(6.dp))
                    }

                    Text(
                        text = stat.student.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                }

                Text(
                    text = "${"%.0f".format(stat.percentage)}%",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (stat.percentage >= 80f) StatusPresent else if (stat.percentage >= 60f) StatusLate else StatusAbsent
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Percentage Bar
            LinearProgressIndicator(
                progress = { (stat.percentage / 100f).coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (stat.percentage >= 80f) StatusPresent else if (stat.percentage >= 60f) StatusLate else StatusAbsent,
                trackColor = MaterialTheme.colorScheme.surfaceVariant
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Counts Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Present: ${stat.presentDays}",
                    style = MaterialTheme.typography.bodySmall,
                    color = StatusPresent,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "Absent: ${stat.absentDays}",
                    style = MaterialTheme.typography.bodySmall,
                    color = StatusAbsent,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "Late: ${stat.lateDays}",
                    style = MaterialTheme.typography.bodySmall,
                    color = StatusLate,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "Leave: ${stat.leaveDays}",
                    style = MaterialTheme.typography.bodySmall,
                    color = StatusLeave,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}
