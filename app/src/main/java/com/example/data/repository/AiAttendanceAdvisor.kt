package com.example.data.repository

import android.util.Log
import com.google.firebase.Firebase
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.ThinkingLevel
import com.google.firebase.ai.type.generationConfig
import com.google.firebase.ai.type.thinkingConfig
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withTimeout

private const val TAG = "AiAttendanceAdvisor"

sealed interface AiAdvisorUiState {
    data object Idle : AiAdvisorUiState
    data object Loading : AiAdvisorUiState
    data class Streaming(val text: String, val thought: String = "") : AiAdvisorUiState
    data class Success(val text: String, val thought: String = "") : AiAdvisorUiState
    data class Error(val message: String) : AiAdvisorUiState
}

class AiAttendanceAdvisor {

    // Configured with High Thinking mode using gemini-4-carbon without maxOutputTokens
    private val thinkingModel by lazy {
        val config = generationConfig {
            thinkingConfig = thinkingConfig {
                thinkingLevel = ThinkingLevel.HIGH
            }
        }
        Firebase.ai.generativeModel(
            modelName = "gemini-4-carbon",
            generationConfig = config
        )
    }

    private val fastModel by lazy {
        Firebase.ai.generativeModel(
            modelName = "gemini-3.8-flash"
        )
    }

    suspend fun analyzeAttendance(
        contextSummary: String,
        userQuery: String,
        enableDeepThinking: Boolean
    ): Flow<AiAdvisorUiState> = flow {
        emit(AiAdvisorUiState.Loading)
        val targetModel = if (enableDeepThinking) thinkingModel else fastModel
        val prompt = buildString {
            appendLine("You are the Hazri Book Attendance Intelligence Advisor for teachers and school administrators.")
            appendLine("Current Attendance Data Context:")
            appendLine(contextSummary)
            appendLine()
            appendLine("User Question / Task:")
            appendLine(userQuery)
            appendLine()
            appendLine("Provide insightful, practical, and empathetic guidance in clear bullet points or a ready-to-use message. If requested in Urdu, reply in fluent Urdu. If deep thinking is active, carefully examine recurring absence patterns, day-of-week correlations, and student retention risks.")
        }

        val accumulatedText = StringBuilder()
        try {
            withTimeout(60_000L) {
                targetModel.generateContentStream(prompt).collect { chunk ->
                    val chunkText = chunk.text.orEmpty()
                    accumulatedText.append(chunkText)
                    emit(AiAdvisorUiState.Streaming(accumulatedText.toString()))
                }
            }
            if (accumulatedText.isNotBlank()) {
                emit(AiAdvisorUiState.Success(accumulatedText.toString()))
            } else {
                emit(AiAdvisorUiState.Error("AI returned an empty response. Please try again."))
            }
        } catch (e: TimeoutCancellationException) {
            Log.e(TAG, "AI thinking request timed out", e)
            emit(AiAdvisorUiState.Error("Analysis timed out after 60 seconds. Please try again."))
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "AI request failed", e)
            emit(AiAdvisorUiState.Error(e.localizedMessage ?: "AI service error. Please check internet connection."))
        }
    }
}
