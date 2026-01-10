/**
 * Card Image Path Utilities
 * Ensures consistent card image paths across the application
 */

/**
 * Base path for card images in Next.js public directory
 */
export const CARD_IMAGES_BASE_PATH = '/features/games/ape-in/assets/images/cards'

/**
 * Get the full path for a card image
 * @param imageName - The card image filename (e.g., 'Cipher_1pt_Abbie.jpg')
 * @returns Full path to the card image
 */
export function getCardImagePath(imageName: string): string {
  // If already a full path, return as is
  if (imageName.startsWith('/') || imageName.startsWith('http')) {
    return imageName
  }
  
  // Ensure it's a relative path from the base
  return `${CARD_IMAGES_BASE_PATH}/${imageName}`
}

/**
 * Get the cardback image path
 */
export function getCardbackPath(): string {
  return `${CARD_IMAGES_BASE_PATH}/Ape_In_Cardback.jpg`
}

/**
 * Normalize card image URL from backend
 * Backend may return:
 * - Full URL: https://domain.com/assets/cards/image.jpg
 * - Relative path: /assets/cards/image.jpg
 * - Just filename: image.jpg
 * 
 * This function normalizes all to Next.js public paths
 */
export function normalizeCardImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return getCardbackPath()
  }
  
  // If it's a full HTTP URL from old backend, extract filename and convert to Next.js path
  if (imageUrl.startsWith('http')) {
    try {
      const url = new URL(imageUrl)
      const filename = url.pathname.split('/').pop() || 'Ape_In_Cardback.jpg'
      return getCardImagePath(filename)
    } catch {
      return getCardbackPath()
    }
  }
  
  // If it starts with /assets/cards/, convert to new path
  if (imageUrl.startsWith('/assets/cards/')) {
    const filename = imageUrl.replace('/assets/cards/', '')
    return getCardImagePath(filename)
  }
  
  // If it already starts with the base path, return as is
  if (imageUrl.startsWith(CARD_IMAGES_BASE_PATH)) {
    return imageUrl
  }
  
  // Otherwise, treat as filename and prepend base path
  return getCardImagePath(imageUrl)
}

/**
 * Card image filename mappings
 * Maps card names to their image filenames for consistent access
 */
export const CARD_IMAGE_MAP: Record<string, string> = {
  // Cipher cards (1pt)
  'Abbie': 'Cipher_1pt_Abbie.jpg',
  'Alita': 'Cipher_1pt_Alita.jpg',
  'En-J1n': 'Cipher_1pt_EnJ1n.jpg',
  'Jakey': 'Cipher_1pt_Jakey.jpg',
  
  // Cipher cards (2pt)
  'Ace': 'Cipher_2pt_Ace.jpg',
  'Beats': 'Cipher_2pt_Beats.jpg',
  'Dash': 'Cipher_2pt_Dash.jpg',
  'Ray': 'Cipher_2pt_Ray.jpg',
  
  // Cipher cards (3pt)
  'Jazzy': 'Cipher_3pt_Jazzy.jpg',
  'Meemo': 'Cipher_3pt_Meemo.jpg',
  'Sabrina': 'Cipher_3pt_Sabrina.jpg',
  'Thea': 'Cipher_3pt_Thea.jpg',
  
  // Cipher cards (5pt)
  'Nero': 'Cipher_5pt_Nero.jpg',
  'Saul': 'Cipher_5pt_Saul.jpg',
  'Somi': 'Cipher_5pt_Somi.jpg',
  'Wick': 'Cipher_5pt_Wick.jpg',
  
  // Cipher cards (8pt)
  'Sandy': 'Cipher_8pt_Sandy.jpg',
  'Tala': 'Cipher_8pt_Tala.jpg',
  'Tulip': 'Cipher_8pt_Tulip.jpg',
  'Zacky': 'Cipher_8pt_Zacky.jpg',
  
  // Historacle cards
  'Sats': 'Historacle_1_Sats.jpg',
  'Fibonacci': 'Historacle_2_Fibonacci.jpg',
  'Gann': 'Historacle_3_Gann.jpg',
  'Dow': 'Historacle_4_Dow.jpg',
  'Elliott': 'Historacle_5_Elliott.jpg',
  
  // Oracle cards (Aida)
  'Oracle_Aida_1': 'Oracle_Aida_1.jpg',
  'Oracle_Aida_2': 'Oracle_Aida_2.jpg',
  'Oracle_Aida_3': 'Oracle_Aida_3.jpg',
  
  // Oracle cards (Lana)
  'Oracle_Lana_1': 'Oracle_Lana_1.jpg',
  'Oracle_Lana_2': 'Oracle_Lana_2.jpg',
  'Oracle_Lana_3': 'Oracle_Lana_3.jpg',
  
  // Oracle cards (Nifty)
  'Oracle_Nifty_1': 'Oracle_Nifty_1.jpg',
  'Oracle_Nifty_2': 'Oracle_Nifty_2.jpg',
  'Oracle_Nifty_3': 'Oracle_Nifty_3.jpg',
  
  // Oracle cards (Sats)
  'Oracle_Sats_1': 'Oracle_Sats_1.jpg',
  'Oracle_Sats_2': 'Oracle_Sats_2.jpg',
  'Oracle_Sats_3': 'Oracle_Sats_3.jpg',
  
  // Bearish cards
  'Bear_Half': 'Bear_Half.jpg',
  'Bear_Minus_10': 'Bear_Minus_10.jpg',
  'Bear_Reset': 'Bear_Reset.jpg',
  
  // Special cards
  'Ape_In': 'Ape_In.jpg',
  'Ape_In_MAYC': 'Ape_In_MAYC.jpg',
  'Ape_In_Historic': 'Ape_In_Historic.jpg',
  'Ape_In_Cardback': 'Ape_In_Cardback.jpg',
}

/**
 * Get card image filename from card name
 */
export function getCardImageFilename(cardName: string): string {
  return CARD_IMAGE_MAP[cardName] || 'Ape_In_Cardback.jpg'
}

