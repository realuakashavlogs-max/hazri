package com.example.ui.screens

import android.widget.Toast
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ColorLens
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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
import com.example.data.model.AttendanceStatusType
import com.example.data.model.User
import com.example.data.model.UserSettings
import com.example.ui.theme.ThemeColors
import com.example.ui.theme.parseHexColor
import com.example.ui.viewmodel.SettingsViewModel
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    viewModel: SettingsViewModel,
    currentUser: User?,
    userSettings: UserSettings?,
    statusTypes: List<AttendanceStatusType>,
    onToggleLanguage: () -> Unit
) {
    val lang = LocalAppLanguage.current
    val context = LocalContext.current

    val currentSettings = userSettings ?: UserSettings(userId = currentUser?.id ?: "")

    var appDisplayName by remember(userSettings) {
        mutableStateOf(currentSettings.appDisplayName)
    }
    var selectedColorHex by remember(userSettings) {
        mutableStateOf(currentSettings.primaryColorHex)
    }
    var isDarkMode by remember(userSettings) {
        mutableStateOf(currentSettings.isDarkMode)
    }
    var whatsappTemplate by remember(userSettings) {
        mutableStateOf(currentSettings.whatsappTemplate)
    }

    var showAddStatusDialog by remember { mutableStateOf(false) }
    var statusToEdit by remember { mutableStateOf<AttendanceStatusType?>(null) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Section 1: User Profile & Custom App Name
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }

                        Column {
                            Text(
                                text = currentUser?.fullName ?: "Educator",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = currentUser?.email ?: "",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "App Header Display Name",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    OutlinedTextField(
                        value = appDisplayName,
                        onValueChange = {
                            appDisplayName = it
                            viewModel.updateUserSettings(currentSettings.copy(appDisplayName = it))
                        },
                        placeholder = { Text("e.g. Dar-ul-Ilm Academy") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("app_display_name_input"),
                        singleLine = true
                    )
                }
            }
        }

        // Section 2: Look & Feel (Theme Color & Dark Mode & Language)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Theme & Customization",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Primary Accent Color",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(ThemeColors) { (name, hex) ->
                            val color = parseHexColor(hex)
                            val isSelected = selectedColorHex.equals(hex, ignoreCase = true)
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(color)
                                    .clickable {
                                        selectedColorHex = hex
                                        viewModel.updateUserSettings(currentSettings.copy(primaryColorHex = hex))
                                    }
                                    .then(
                                        if (isSelected) Modifier.border(3.dp, MaterialTheme.colorScheme.onSurface, CircleShape) else Modifier
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (isSelected) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    // Dark Mode Switch
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.DarkMode, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Dark Theme", fontWeight = FontWeight.Medium)
                        }

                        Switch(
                            checked = isDarkMode,
                            onCheckedChange = {
                                isDarkMode = it
                                viewModel.updateUserSettings(currentSettings.copy(isDarkMode = it))
                            },
                            modifier = Modifier.testTag("dark_mode_switch")
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Language Toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Language, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Language (زبان)", fontWeight = FontWeight.Medium)
                        }

                        Button(
                            onClick = onToggleLanguage,
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Text(if (lang == "ur") "اردو (Urdu RTL)" else "English (LTR)", fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        // Section 3: Custom Status Types Manager (PRD 4.7)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = AppStrings.get("custom_status", lang),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Define custom attendance badges",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }

                        Button(
                            onClick = { showAddStatusDialog = true },
                            shape = RoundedCornerShape(20.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Add Status", fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        statusTypes.forEach { st ->
                            val color = parseHexColor(st.colorHex)
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .size(14.dp)
                                                .clip(CircleShape)
                                                .background(color)
                                        )
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column {
                                            Text(
                                                text = "${st.nameEn} • ${st.nameUr}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp
                                            )
                                            Text(
                                                text = if (st.isPresentCount) "Counts as Present" else "Does not count as Present",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = if (st.isPresentCount) parseHexColor("#2E7D32") else parseHexColor("#D32F2F")
                                            )
                                        }
                                    }

                                    Row {
                                        IconButton(onClick = { statusToEdit = st }) {
                                            Icon(Icons.Default.Edit, contentDescription = "Edit", modifier = Modifier.size(18.dp))
                                        }
                                        if (!st.isSystem) {
                                            IconButton(
                                                onClick = {
                                                    viewModel.deleteStatusType(st.id) { err ->
                                                        if (err != null) {
                                                            Toast.makeText(context, err, Toast.LENGTH_LONG).show()
                                                        } else {
                                                            Toast.makeText(context, "Status deleted", Toast.LENGTH_SHORT).show()
                                                        }
                                                    }
                                                }
                                            ) {
                                                Icon(
                                                    Icons.Default.Delete,
                                                    contentDescription = "Delete",
                                                    tint = MaterialTheme.colorScheme.error,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Section 4: WhatsApp Notification Template Editor (PRD 4.5 & 4.7)
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = AppStrings.get("whatsapp_template", lang),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Customize the automated message sent to parents via WhatsApp.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Placeholder Insertion Chips
                    Text(
                        text = "Tap placeholder to insert:",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            "{student_name}",
                            "{class_name}",
                            "{status}",
                            "{date}",
                            "{app_name}"
                        ).forEach { placeholder ->
                            item {
                                Surface(
                                    color = MaterialTheme.colorScheme.primaryContainer,
                                    shape = RoundedCornerShape(16.dp),
                                    modifier = Modifier.clickable {
                                        whatsappTemplate += " $placeholder"
                                        viewModel.updateUserSettings(currentSettings.copy(whatsappTemplate = whatsappTemplate))
                                    }
                                ) {
                                    Text(
                                        text = placeholder,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedTextField(
                        value = whatsappTemplate,
                        onValueChange = {
                            whatsappTemplate = it
                            viewModel.updateUserSettings(currentSettings.copy(whatsappTemplate = it))
                        },
                        label = { Text("Message Template") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("whatsapp_template_input"),
                        minLines = 4
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Live Preview
                    Text(
                        text = "Live Preview:",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        val preview = whatsappTemplate
                            .replace("{student_name}", "Muhammad Ali")
                            .replace("{class_name}", "Class 5 - Green")
                            .replace("{status}", "Absent (غیر حاضر)")
                            .replace("{date}", "2026-11-12")
                            .replace("{app_name}", appDisplayName)
                        Text(
                            text = preview,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(60.dp))
        }
    }

    // Add / Edit Custom Status Dialog
    if (showAddStatusDialog || statusToEdit != null) {
        val editing = statusToEdit
        var nameEn by remember(editing) { mutableStateOf(editing?.nameEn ?: "") }
        var nameUr by remember(editing) { mutableStateOf(editing?.nameUr ?: "") }
        var colorHex by remember(editing) { mutableStateOf(editing?.colorHex ?: "#8E24AA") }
        var isPresent by remember(editing) { mutableStateOf(editing?.isPresentCount ?: false) }

        val colorPresets = listOf("#2E7D32", "#D32F2F", "#F57C00", "#1976D2", "#8E24AA", "#00897B", "#5D4037")

        AlertDialog(
            onDismissRequest = {
                showAddStatusDialog = false
                statusToEdit = null
            },
            title = { Text(if (editing == null) "New Status Type" else "Edit Status") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = nameEn,
                        onValueChange = { nameEn = it },
                        label = { Text("English Name *") },
                        placeholder = { Text("e.g. Excused, Medical") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = nameUr,
                        onValueChange = { nameUr = it },
                        label = { Text("Urdu Name (اردو نام)") },
                        placeholder = { Text("e.g. عذر، رخصت بیماری") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("Pick Color:", style = MaterialTheme.typography.labelSmall)
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(colorPresets) { hex ->
                            val c = parseHexColor(hex)
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .background(c)
                                    .clickable { colorHex = hex }
                                    .then(
                                        if (colorHex == hex) Modifier.border(3.dp, MaterialTheme.colorScheme.onSurface, CircleShape) else Modifier
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (colorHex == hex) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White)
                                }
                            }
                        }
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { isPresent = !isPresent }
                    ) {
                        Checkbox(checked = isPresent, onCheckedChange = { isPresent = it })
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Counts as Present towards Attendance %")
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (nameEn.isNotBlank()) {
                            if (editing == null) {
                                viewModel.addCustomStatus(nameEn, nameUr.ifEmpty { nameEn }, colorHex, isPresent)
                            } else {
                                viewModel.updateStatusType(
                                    editing.copy(
                                        nameEn = nameEn,
                                        nameUr = nameUr.ifEmpty { nameEn },
                                        colorHex = colorHex,
                                        isPresentCount = isPresent
                                    )
                                )
                            }
                            showAddStatusDialog = false
                            statusToEdit = null
                        }
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showAddStatusDialog = false
                    statusToEdit = null
                }) {
                    Text("Cancel")
                }
            }
        )
    }
}
