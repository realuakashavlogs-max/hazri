package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

fun parseHexColor(hex: String, default: Color = EmeraldPrimary): Color {
    return try {
        val clean = hex.removePrefix("#")
        val colorInt = clean.toLong(16)
        if (clean.length == 6) {
            Color(colorInt or 0x00000000FF000000)
        } else {
            Color(colorInt)
        }
    } catch (_: Exception) {
        default
    }
}

@Composable
fun HazriBookTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    primaryHex: String = "#124E3F",
    content: @Composable () -> Unit
) {
    val primaryColor = parseHexColor(primaryHex, EmeraldPrimary)

    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = primaryColor,
            onPrimary = Color.White,
            primaryContainer = primaryColor.copy(alpha = 0.35f),
            onPrimaryContainer = Color(0xFFD0F0E6),
            secondary = GoldAccent,
            onSecondary = Color.Black,
            secondaryContainer = GoldAccent.copy(alpha = 0.25f),
            onSecondaryContainer = Color(0xFFFFF4D4),
            tertiary = TealAccent,
            background = DarkSurface,
            onBackground = Color(0xFFE2E3DF),
            surface = DarkSurfaceElevated,
            onSurface = Color(0xFFE2E3DF),
            surfaceVariant = Color(0xFF24302C),
            onSurfaceVariant = Color(0xFFC0C9C3)
        )
    } else {
        lightColorScheme(
            primary = primaryColor,
            onPrimary = Color.White,
            primaryContainer = EmeraldContainer,
            onPrimaryContainer = OnEmeraldContainer,
            secondary = GoldAccent,
            onSecondary = Color.Black,
            secondaryContainer = GoldContainer,
            onSecondaryContainer = OnGoldContainer,
            tertiary = TealAccent,
            background = MintBackground,
            onBackground = Color(0xFF191C1B),
            surface = Color.White,
            onSurface = Color(0xFF191C1B),
            surfaceVariant = Color(0xFFE6EFEA),
            onSurfaceVariant = Color(0xFF3F4945)
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
