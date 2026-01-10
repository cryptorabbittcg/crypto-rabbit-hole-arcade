/**
 * Result Submission Service
 * Handles submitting game results to Arcade Hub API
 */

import { isEmbedded } from '../lib/identity-bridge'
import type { ResultSubmissionPayload, ResultSubmissionResponse } from '../types/result'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Submit game result to Arcade Hub
 * In embedded mode, calls the API. In standalone mode with VITE_ALLOW_STANDALONE=true, logs and returns mocked success.
 * 
 * @param payload - The result submission payload
 * @returns Promise<ResultSubmissionResponse>
 */
export async function submitResult(
  payload: ResultSubmissionPayload
): Promise<ResultSubmissionResponse> {
  // Dev fallback: log and return mocked success in standalone mode
  const allowStandalone = import.meta.env.VITE_ALLOW_STANDALONE === 'true'
  const embedded = isEmbedded()

  if (!embedded && allowStandalone) {
    console.log('🔧 Standalone mode: Mocking result submission', payload)
    return {
      success: true,
      message: 'Result submitted (dev mode)',
    }
  }

  // Embedded mode or no standalone flag: call API
  if (!payload.playerAddress) {
    return {
      success: false,
      error: 'Player address is required',
    }
  }

  // Validate ranked submission requires playToken
  if (payload.isRanked && !payload.playToken) {
    return {
      success: false,
      error: 'Play token is required for ranked submissions',
    }
  }

  try {
    console.log('📤 Submitting result:', {
      modeId: payload.modeId,
      isRanked: payload.isRanked,
      result: payload.result,
      runId: payload.runId,
      hasToken: !!payload.playToken,
    })

    const response = await fetch(`${API_BASE_URL}/api/apein/submit-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Result submission failed:', response.status, errorText)
      return {
        success: false,
        error: `Server error: ${response.status}`,
      }
    }

    const data = await response.json() as ResultSubmissionResponse

    console.log('✅ Result submitted successfully:', data)

    return data
  } catch (error) {
    console.error('❌ Failed to submit result:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

