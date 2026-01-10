/**
 * Result Submission Service
 * Handles submitting game results to Arcade Hub API
 * NOTE: Results are now submitted via onGameEnd callback in parent component
 * This service is kept for compatibility but may be removed
 */

import type { ResultSubmissionPayload, ResultSubmissionResponse } from '../types/result'

/**
 * Submit game result to Arcade Hub
 * NOTE: This is no longer used - results are handled via onGameEnd callback
 * Kept for backwards compatibility only
 * 
 * @param payload - The result submission payload
 * @returns Promise<ResultSubmissionResponse>
 */
export async function submitResult(
  payload: ResultSubmissionPayload
): Promise<ResultSubmissionResponse> {
  console.log('📤 Result submission via callback (deprecated function):', payload)
  
  // Results are now handled by parent component via onGameEnd callback
  // This function is kept for backwards compatibility
  return {
    success: true,
    message: 'Result handled via callback',
  }
}

