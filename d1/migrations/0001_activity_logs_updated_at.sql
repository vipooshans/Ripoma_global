-- Migration: 0001_activity_logs_updated_at.sql
-- Description: Add nullable updated_at column to activity_logs table
-- Safe for production data: adds nullable column without table recreation or data loss.

ALTER TABLE activity_logs ADD COLUMN updated_at TEXT;
