package com.example.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.repository.HazriRepository
import com.example.ui.components.AppTopHeader
import com.example.ui.screens.AdminScreen
import com.example.ui.screens.AiAdvisorScreen
import com.example.ui.screens.AttendanceScreen
import com.example.ui.screens.AuthScreen
import com.example.ui.screens.BlockedAccountScreen
import com.example.ui.screens.ClassesScreen
import com.example.ui.screens.ReportsScreen
import com.example.ui.screens.SettingsScreen
import com.example.ui.screens.StudentsScreen
import com.example.ui.viewmodel.AdminViewModel
import com.example.ui.viewmodel.AiAdvisorViewModel
import com.example.ui.viewmodel.AttendanceViewModel
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.ClassesViewModel
import com.example.ui.viewmodel.ReportsViewModel
import com.example.ui.viewmodel.SettingsViewModel
import com.example.ui.viewmodel.StudentsViewModel
import com.example.util.AppLanguageProvider
import com.example.util.AppStrings

sealed class Screen(val route: String, val titleKey: String, val icon: ImageVector) {
    data object Attendance : Screen("attendance", "attendance", Icons.Default.CheckCircle)
    data object Classes : Screen("classes", "classes", Icons.Default.School)
    data object Students : Screen("students", "students", Icons.Default.People)
    data object Reports : Screen("reports", "reports", Icons.Default.Assessment)
    data object AiAdvisor : Screen("ai_advisor", "ai_advisor", Icons.Default.Psychology)
    data object Settings : Screen("settings", "settings", Icons.Default.Settings)
    data object Admin : Screen("admin", "admin_panel", Icons.Default.AdminPanelSettings)
}

@Composable
fun MainAppContainer(
    repository: HazriRepository,
    authViewModel: AuthViewModel,
    attendanceViewModel: AttendanceViewModel,
    classesViewModel: ClassesViewModel,
    studentsViewModel: StudentsViewModel,
    reportsViewModel: ReportsViewModel,
    settingsViewModel: SettingsViewModel,
    adminViewModel: AdminViewModel,
    aiAdvisorViewModel: AiAdvisorViewModel
) {
    val currentUser by authViewModel.currentUser.collectAsState()
    val inspectingUserId by adminViewModel.inspectingUserId.collectAsState()

    val effectiveUserId = repository.getEffectiveUserId() ?: currentUser?.id ?: ""
    val userSettings by repository.getUserSettings(effectiveUserId).collectAsState(initial = null)
    val globalSettings by repository.getGlobalSettings().collectAsState(initial = null)

    val currentLang = userSettings?.language ?: "en"

    // If no user is logged in, show AuthScreen
    if (currentUser == null) {
        AppLanguageProvider(language = currentLang) {
            AuthScreen(
                viewModel = authViewModel,
                onAuthSuccess = {}
            )
        }
        return
    }

    // If user is blocked, show Blocked Screen
    if (currentUser?.isBlocked == true) {
        AppLanguageProvider(language = currentLang) {
            BlockedAccountScreen(
                user = currentUser!!,
                onLogout = { authViewModel.logout() }
            )
        }
        return
    }

    var currentScreen by remember { mutableStateOf<Screen>(Screen.Attendance) }

    val classes by repository.getClasses(effectiveUserId).collectAsState(initial = emptyList())
    val allClasses by repository.getAllClasses(effectiveUserId).collectAsState(initial = emptyList())
    val students by repository.getAllStudentsForUser(effectiveUserId).collectAsState(initial = emptyList())
    val attendanceRecords by repository.getAllAttendanceForUser(effectiveUserId).collectAsState(initial = emptyList())
    val statusTypes by repository.getStatusTypes(effectiveUserId).collectAsState(initial = emptyList())

    val isReadOnly = inspectingUserId != null

    AppLanguageProvider(language = currentLang) {
        Scaffold(
            topBar = {
                AppTopHeader(
                    appDisplayName = userSettings?.appDisplayName ?: "Hazri Book",
                    currentUser = currentUser,
                    isInspecting = isReadOnly,
                    onExitInspection = {
                        adminViewModel.inspectUser(null)
                        currentScreen = Screen.Admin
                    },
                    onToggleLanguage = {
                        val nextLang = if (currentLang == "en") "ur" else "en"
                        userSettings?.let {
                            settingsViewModel.updateUserSettings(it.copy(language = nextLang))
                        }
                    },
                    onLogout = {
                        adminViewModel.inspectUser(null)
                        authViewModel.logout()
                    }
                )
            },
            bottomBar = {
                val navItems = mutableListOf(
                    Screen.Attendance,
                    Screen.Classes,
                    Screen.Students,
                    Screen.Reports,
                    Screen.AiAdvisor,
                    Screen.Settings
                )
                if (currentUser?.isAdmin == true) {
                    navItems.add(Screen.Admin)
                }

                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface,
                    tonalElevation = 8.dp
                ) {
                    navItems.forEach { screen ->
                        val isSelected = currentScreen.route == screen.route
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = { currentScreen = screen },
                            icon = {
                                Icon(screen.icon, contentDescription = AppStrings.get(screen.titleKey, currentLang))
                            },
                            label = {
                                Text(
                                    text = AppStrings.get(screen.titleKey, currentLang),
                                    fontSize = 10.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            modifier = Modifier.testTag("nav_item_${screen.route}")
                        )
                    }
                }
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                when (currentScreen) {
                    is Screen.Attendance -> {
                        val selectedDate by attendanceViewModel.selectedDate.collectAsState()
                        val selectedClassId by attendanceViewModel.selectedClassId.collectAsState()
                        val dateAttendance by repository.getAttendanceForDate(
                            userId = effectiveUserId,
                            classId = selectedClassId ?: "",
                            date = selectedDate
                        ).collectAsState(initial = emptyList())

                        AttendanceScreen(
                            viewModel = attendanceViewModel,
                            classes = classes,
                            students = students,
                            existingAttendance = dateAttendance,
                            statusTypes = statusTypes,
                            userSettings = userSettings,
                            isReadOnly = isReadOnly,
                            onNavigateToClasses = { currentScreen = Screen.Classes }
                        )
                    }

                    is Screen.Classes -> {
                        ClassesScreen(
                            viewModel = classesViewModel,
                            allClasses = allClasses,
                            students = students,
                            isReadOnly = isReadOnly,
                            onSelectClassToMark = { classId ->
                                attendanceViewModel.selectClass(classId)
                                currentScreen = Screen.Attendance
                            }
                        )
                    }

                    is Screen.Students -> {
                        StudentsScreen(
                            viewModel = studentsViewModel,
                            classes = classes,
                            students = students,
                            isReadOnly = isReadOnly,
                            onNavigateToClasses = { currentScreen = Screen.Classes }
                        )
                    }

                    is Screen.Reports -> {
                        ReportsScreen(
                            viewModel = reportsViewModel,
                            classes = classes,
                            students = students,
                            attendanceRecords = attendanceRecords,
                            statusTypes = statusTypes
                        )
                    }

                    is Screen.AiAdvisor -> {
                        AiAdvisorScreen(
                            viewModel = aiAdvisorViewModel,
                            classes = classes,
                            students = students,
                            records = attendanceRecords
                        )
                    }

                    is Screen.Settings -> {
                        SettingsScreen(
                            viewModel = settingsViewModel,
                            currentUser = currentUser,
                            userSettings = userSettings,
                            statusTypes = statusTypes,
                            onToggleLanguage = {
                                val nextLang = if (currentLang == "en") "ur" else "en"
                                userSettings?.let {
                                    settingsViewModel.updateUserSettings(it.copy(language = nextLang))
                                }
                            }
                        )
                    }

                    is Screen.Admin -> {
                        AdminScreen(
                            viewModel = adminViewModel,
                            currentUser = currentUser,
                            globalSettings = globalSettings,
                            onInspectUser = { inspectedUser ->
                                adminViewModel.inspectUser(inspectedUser.id)
                                currentScreen = Screen.Attendance
                            }
                        )
                    }
                }
            }
        }
    }
}
