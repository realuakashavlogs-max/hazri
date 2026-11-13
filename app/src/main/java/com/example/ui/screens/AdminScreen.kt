package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.LockOpen
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import com.example.data.model.GlobalSettings
import com.example.data.model.User
import com.example.ui.components.StatCard
import com.example.ui.theme.GoldAccent
import com.example.ui.viewmodel.AdminViewModel
import com.example.util.AppStrings
import com.example.util.LocalAppLanguage
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun AdminScreen(
    viewModel: AdminViewModel,
    currentUser: User?,
    globalSettings: GlobalSettings?,
    onInspectUser: (User) -> Unit
) {
    val lang = LocalAppLanguage.current
    val users by viewModel.usersList.collectAsState()
    val inspectingUserId by viewModel.inspectingUserId.collectAsState()

    var selectedTab by remember { mutableIntStateOf(0) } // 0: Users, 1: Global App Settings

    var userToConfirmBlock by remember { mutableStateOf<User?>(null) }
    var userToChangeRole by remember { mutableStateOf<User?>(null) }

    val dateFormat = remember { SimpleDateFormat("dd MMM yyyy", Locale.US) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Admin Banner
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(GoldAccent),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AdminPanelSettings,
                        contentDescription = "Admin",
                        tint = Color.Black,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column {
                    Text(
                        text = AppStrings.get("admin_panel", lang),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = "Global user management & system-wide defaults",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Tabs
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Users (${users.size})", fontWeight = FontWeight.Bold) }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("Global Settings", fontWeight = FontWeight.Bold) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (selectedTab == 0) {
            // Users Management Tab
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        StatCard(
                            title = "Total Users",
                            value = "${users.size}",
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "Active Accounts",
                            value = "${users.count { !it.isBlocked }}",
                            color = MaterialTheme.colorScheme.tertiary,
                            modifier = Modifier.weight(1f)
                        )
                        StatCard(
                            title = "Blocked",
                            value = "${users.count { it.isBlocked }}",
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                items(users, key = { it.id }) { u ->
                    val isSelf = u.id == currentUser?.id
                    val isCurrentlyInspecting = u.id == inspectingUserId

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("admin_user_card_${u.id}"),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isCurrentlyInspecting) MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface
                        ),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = u.fullName,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )

                                        Spacer(modifier = Modifier.width(8.dp))

                                        // Role badge
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(4.dp))
                                                .background(if (u.isAdmin) GoldAccent else MaterialTheme.colorScheme.secondaryContainer)
                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = u.role.uppercase(),
                                                color = if (u.isAdmin) Color.Black else MaterialTheme.colorScheme.onSecondaryContainer,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }

                                        if (u.isBlocked) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(MaterialTheme.colorScheme.error)
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = "BLOCKED",
                                                    color = Color.White,
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(2.dp))

                                    Text(
                                        text = u.email,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.outline
                                    )

                                    Text(
                                        text = "Joined: ${dateFormat.format(Date(u.createdAt))}",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(10.dp))
                            HorizontalDivider()
                            Spacer(modifier = Modifier.height(8.dp))

                            // Action buttons: Inspect, Block/Unblock, Role
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Inspect User Records (PRD 4.9: Read-only view of any user's data)
                                OutlinedButton(
                                    onClick = { onInspectUser(u) },
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(if (isCurrentlyInspecting) "Inspecting" else "Inspect Records", fontSize = 11.sp)
                                }

                                if (!isSelf) {
                                    // Block/Unblock
                                    Button(
                                        onClick = { userToConfirmBlock = u },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (u.isBlocked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                                        ),
                                        modifier = Modifier.weight(0.9f)
                                    ) {
                                        Icon(
                                            if (u.isBlocked) Icons.Default.LockOpen else Icons.Default.Block,
                                            contentDescription = null,
                                            modifier = Modifier.size(16.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text(if (u.isBlocked) "Unblock" else "Block", fontSize = 11.sp)
                                    }

                                    // Role toggle
                                    TextButton(onClick = { userToChangeRole = u }) {
                                        Text(if (u.isAdmin) "Demote" else "Make Admin", fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(60.dp))
                }
            }
        } else {
            // Global Settings Tab
            val settings = globalSettings ?: GlobalSettings()
            var defAppName by remember(settings) { mutableStateOf(settings.defaultAppName) }
            var defTemplate by remember(settings) { mutableStateOf(settings.defaultWhatsappTemplate) }

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "New User Defaults",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "These values will be automatically cloned whenever a new teacher or tutor registers.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.outline
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        OutlinedTextField(
                            value = defAppName,
                            onValueChange = { defAppName = it },
                            label = { Text("Default App Name") },
                            modifier = Modifier.fillMaxWidth()
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedTextField(
                            value = defTemplate,
                            onValueChange = { defTemplate = it },
                            label = { Text("Default WhatsApp Template") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 3
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = {
                                viewModel.updateGlobalSettings(
                                    settings.copy(
                                        defaultAppName = defAppName,
                                        defaultWhatsappTemplate = defTemplate
                                    )
                                )
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Save Global Settings")
                        }
                    }
                }
            }
        }
    }

    // Block / Unblock Confirmation Dialog
    if (userToConfirmBlock != null) {
        val u = userToConfirmBlock!!
        AlertDialog(
            onDismissRequest = { userToConfirmBlock = null },
            title = { Text(if (u.isBlocked) "Unblock User?" else "Block User?") },
            text = {
                Text(
                    if (u.isBlocked)
                        "Are you sure you want to unblock ${u.fullName}? They will be able to log in and use Hazri Book again."
                    else
                        "Blocking ${u.fullName} will immediately revoke their access. They will see the blocked screen and cannot read or write data."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.setUserBlocked(u.id, !u.isBlocked)
                        userToConfirmBlock = null
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (u.isBlocked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error
                    )
                ) {
                    Text(if (u.isBlocked) "Unblock" else "Block Account")
                }
            },
            dismissButton = {
                TextButton(onClick = { userToConfirmBlock = null }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Role Change Confirmation Dialog
    if (userToChangeRole != null) {
        val u = userToChangeRole!!
        val newRole = if (u.isAdmin) User.ROLE_USER else User.ROLE_ADMIN
        AlertDialog(
            onDismissRequest = { userToChangeRole = null },
            title = { Text("Change Role for ${u.fullName}?") },
            text = {
                Text("Change role from ${u.role.uppercase()} to ${newRole.uppercase()}? Admins have access to the Admin panel and can inspect other users.")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.setUserRole(u.id, newRole)
                        userToChangeRole = null
                    }
                ) {
                    Text("Confirm Role Change")
                }
            },
            dismissButton = {
                TextButton(onClick = { userToChangeRole = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
