package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import com.example.data.repository.AiAttendanceAdvisor
import com.example.data.repository.HazriRepository
import com.example.ui.navigation.MainAppContainer
import com.example.ui.theme.HazriBookTheme
import com.example.ui.viewmodel.AdminViewModel
import com.example.ui.viewmodel.AiAdvisorViewModel
import com.example.ui.viewmodel.AttendanceViewModel
import com.example.ui.viewmodel.AuthViewModel
import com.example.ui.viewmodel.ClassesViewModel
import com.example.ui.viewmodel.HazriViewModelFactory
import com.example.ui.viewmodel.ReportsViewModel
import com.example.ui.viewmodel.SettingsViewModel
import com.example.ui.viewmodel.StudentsViewModel
import com.example.util.configureAppCheck

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // STEP 1: Mandatory App Check configuration with launch intent before any UI or Firebase operations
        configureAppCheck(this, intent)

        enableEdgeToEdge()

        val repository = HazriRepository(applicationContext)
        val aiAdvisor = AiAttendanceAdvisor()
        val factory = HazriViewModelFactory(repository, aiAdvisor)

        val authViewModel by viewModels<AuthViewModel> { factory }
        val attendanceViewModel by viewModels<AttendanceViewModel> { factory }
        val classesViewModel by viewModels<ClassesViewModel> { factory }
        val studentsViewModel by viewModels<StudentsViewModel> { factory }
        val reportsViewModel by viewModels<ReportsViewModel> { factory }
        val settingsViewModel by viewModels<SettingsViewModel> { factory }
        val adminViewModel by viewModels<AdminViewModel> { factory }
        val aiAdvisorViewModel by viewModels<AiAdvisorViewModel> { factory }

        setContent {
            val currentUser by authViewModel.currentUser.collectAsState()
            val effectiveUserId = repository.getEffectiveUserId() ?: currentUser?.id ?: ""
            val userSettings by repository.getUserSettings(effectiveUserId).collectAsState(initial = null)

            val primaryHex = userSettings?.primaryColorHex ?: "#124E3F"
            val isDark = userSettings?.isDarkMode ?: false

            HazriBookTheme(
                darkTheme = isDark,
                primaryHex = primaryHex
            ) {
                MainAppContainer(
                    repository = repository,
                    authViewModel = authViewModel,
                    attendanceViewModel = attendanceViewModel,
                    classesViewModel = classesViewModel,
                    studentsViewModel = studentsViewModel,
                    reportsViewModel = reportsViewModel,
                    settingsViewModel = settingsViewModel,
                    adminViewModel = adminViewModel,
                    aiAdvisorViewModel = aiAdvisorViewModel
                )
            }
        }
    }
}
