-- =====================================================
-- ADD REFERRAL COLUMNS TO PROFILES TABLE
-- =====================================================
-- Run this script if you already created the profiles table
-- and need to add referral system columns

-- Add referral_code column (unique, allows NULL)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referral_count column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0;

-- Add referral_earnings column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_earnings INTEGER DEFAULT 0;

-- Create index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

