-- ==============================================================================
-- TrueTawakkul Company Portal — Genesis Database Migration (v2.1 Final)
-- Target Database: PostgreSQL 15+ (Supabase Managed)
-- Migration ID: 20260807000000_genesis
-- Description: Single source-of-truth genesis migration. Clean slate, 0 legacy baggage.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS & SCHEMAS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS forensic;

-- ------------------------------------------------------------------------------
-- 2. CUSTOM DOMAIN TYPES (ENUMS)
-- ------------------------------------------------------------------------------
CREATE TYPE app.user_role_code AS ENUM (
    'COMPANY_SUPER_ADMIN', 
    'MOSQUE_ADMIN'
);

CREATE TYPE app.user_status AS ENUM (
    'PHONE_VERIFICATION_PENDING', 
    'PHONE_VERIFIED', 
    'ACCOUNT_CREATED', 
    'CREDENTIAL_SENT', 
    'FIRST_LOGIN_PENDING', 
    'ACTIVE', 
    'INACTIVE'
);

CREATE TYPE app.masjid_operational_status AS ENUM (
    'INACTIVE', 
    'ACTIVE', 
    'ARCHIVED'
);

CREATE TYPE app.masjid_governance_state AS ENUM (
    'COMPANY_MANAGED', 
    'ADMIN_MANAGED'
);

CREATE TYPE app.onboarding_status AS ENUM (
    'IN_PROGRESS', 
    'WAITING_MANUAL_VERIFICATION', 
    'MANUAL_VERIFICATION_COMPLETED', 
    'INITIAL_APPROVAL', 
    'GO_LIVE', 
    'APPROVED', 
    'REJECTED'
);

CREATE TYPE app.verification_result AS ENUM (
    'PASSED', 
    'CHANGES_REQUESTED', 
    'REJECTED'
);

CREATE TYPE app.prayer_name AS ENUM (
    'FAJR', 
    'SUNRISE', 
    'DHUHR', 
    'ASR', 
    'MAGHRIB', 
    'ISHA', 
    'JUMUAH'
);

CREATE TYPE app.schedule_status AS ENUM (
    'DRAFT', 
    'PUBLISHED', 
    'ARCHIVED'
);

CREATE TYPE app.schedule_change_reason AS ENUM (
    'INITIAL_ONBOARDING', 
    'RAMADAN', 
    'WINTER', 
    'SUMMER', 
    'SPECIAL_EVENT', 
    'ADMIN_CORRECTION', 
    'EMERGENCY'
);

CREATE TYPE app.media_type AS ENUM (
    'LOGO', 
    'COVER_IMAGE', 
    'GALLERY'
);

CREATE TYPE app.media_status AS ENUM (
    'PENDING_MODERATION', 
    'APPROVED', 
    'REJECTED'
);

CREATE TYPE app.notification_channel AS ENUM (
    'WHATSAPP', 
    'SMS', 
    'EMAIL'
);

CREATE TYPE app.notification_status AS ENUM (
    'PENDING', 
    'PROCESSING', 
    'SENT', 
    'DELIVERED', 
    'FAILED'
);

-- ------------------------------------------------------------------------------
-- 3. TABLES DEFINITIONS (SCHEMA: app)
-- ------------------------------------------------------------------------------

-- Table 1: app.users (Identity)
CREATE TABLE app.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    mobile_phone VARCHAR(20) NOT NULL UNIQUE,
    whatsapp_phone VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    designation VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status app.user_status NOT NULL DEFAULT 'PHONE_VERIFICATION_PENDING',
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Table 2: app.roles & app.user_roles (RBAC)
CREATE TABLE app.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code app.user_role_code NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app.user_roles (
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES app.users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Table 3: app.auth_credentials
CREATE TABLE app.auth_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    requires_password_change BOOLEAN NOT NULL DEFAULT true,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 4: app.otp_verifications
CREATE TABLE app.otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 5: app.masjids (Registry)
CREATE TABLE app.masjids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_english VARCHAR(250) NOT NULL,
    name_arabic VARCHAR(250),
    category VARCHAR(50),
    capacity INT,
    description TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    website VARCHAR(255),
    facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    address_line1 VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    timezone VARCHAR(50) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    google_place_id VARCHAR(255),
    search_vector TSVECTOR,
    status app.masjid_operational_status NOT NULL DEFAULT 'INACTIVE',
    governance_state app.masjid_governance_state NOT NULL DEFAULT 'COMPANY_MANAGED',
    created_by UUID NOT NULL REFERENCES app.users(id),
    updated_by UUID REFERENCES app.users(id),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Table 6: app.onboarding_applications
CREATE TABLE app.onboarding_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(50) NOT NULL UNIQUE,
    masjid_id UUID NOT NULL REFERENCES app.masjids(id) ON DELETE CASCADE,
    status app.onboarding_status NOT NULL DEFAULT 'IN_PROGRESS',
    current_step INT NOT NULL DEFAULT 1,
    masjid_name_english VARCHAR(250) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    verification_result app.verification_result,
    verified_by UUID REFERENCES app.users(id),
    verification_date TIMESTAMPTZ,
    verification_notes TEXT,
    verification_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    gps_confirmation GEOMETRY(Point, 4326),
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 7: app.onboarding_application_history
CREATE TABLE app.onboarding_application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES app.onboarding_applications(id) ON DELETE CASCADE,
    from_status app.onboarding_status NOT NULL,
    to_status app.onboarding_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES app.users(id),
    notes TEXT,
    correlation_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 8: app.schedules (Temporal Timetable Ledger)
CREATE TABLE app.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    masjid_id UUID NOT NULL REFERENCES app.masjids(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Default Schedule',
    status app.schedule_status NOT NULL DEFAULT 'DRAFT',
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    is_current BOOLEAN NOT NULL DEFAULT true,
    change_reason app.schedule_change_reason NOT NULL DEFAULT 'INITIAL_ONBOARDING',
    change_notes TEXT,
    version BIGINT NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES app.users(id),
    updated_by UUID REFERENCES app.users(id),
    published_by UUID REFERENCES app.users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 9: app.schedule_entries
CREATE TABLE app.schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES app.schedules(id) ON DELETE CASCADE,
    prayer_name app.prayer_name NOT NULL,
    adhan_time TIME,
    iqamah_time TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_schedule_prayer UNIQUE (schedule_id, prayer_name)
);

-- Table 10: app.media
CREATE TABLE app.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    masjid_id UUID NOT NULL REFERENCES app.masjids(id) ON DELETE CASCADE,
    media_type app.media_type NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'SUPABASE',
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    width INT,
    height INT,
    blurhash VARCHAR(100),
    status app.media_status NOT NULL DEFAULT 'PENDING_MODERATION',
    moderation_notes TEXT,
    approved_by UUID REFERENCES app.users(id),
    approved_at TIMESTAMPTZ,
    uploaded_by UUID NOT NULL REFERENCES app.users(id),
    updated_by UUID REFERENCES app.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 11: app.masjid_assignments (1:1 Binding)
CREATE TABLE app.masjid_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    masjid_id UUID NOT NULL REFERENCES app.masjids(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES app.users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    revoked_by UUID REFERENCES app.users(id),
    revocation_reason TEXT,
    version BIGINT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 12: app.idempotency_keys
CREATE TABLE app.idempotency_keys (
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(255) NOT NULL,
    api_version VARCHAR(20) NOT NULL DEFAULT 'v1',
    http_method VARCHAR(10) NOT NULL,
    request_path TEXT NOT NULL,
    request_fingerprint VARCHAR(128) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    response_code INT,
    response_headers JSONB,
    response_body JSONB,
    processing_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, idempotency_key)
);

-- Table 13: app.notification_outbox
CREATE TABLE app.notification_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    channel app.notification_channel NOT NULL,
    template_code VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    provider VARCHAR(50) NOT NULL DEFAULT 'TWILIO',
    provider_message_id VARCHAR(255),
    status app.notification_status NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 14: app.system_settings
CREATE TABLE app.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES app.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABLES DEFINITIONS (SCHEMA: forensic)
-- ------------------------------------------------------------------------------

-- ------------------------------------------------------------------------------
-- 5. INDEXES & CONSTRAINTS
-- ------------------------------------------------------------------------------

-- Users
CREATE INDEX idx_users_mobile_phone ON app.users(mobile_phone) WHERE (deleted_at IS NULL);
CREATE INDEX idx_users_email ON app.users(email) WHERE (email IS NOT NULL AND deleted_at IS NULL);

-- Masjids
CREATE INDEX idx_masjids_location_gist ON app.masjids USING GIST(location);
CREATE INDEX idx_masjids_search_vector_gin ON app.masjids USING GIN(search_vector);
CREATE UNIQUE INDEX idx_masjids_google_place_id ON app.masjids(google_place_id) WHERE (google_place_id IS NOT NULL AND deleted_at IS NULL);
CREATE INDEX idx_masjids_city_status ON app.masjids(city, status, governance_state) WHERE (deleted_at IS NULL);

-- Onboarding Applications
CREATE UNIQUE INDEX idx_onboarding_app_number ON app.onboarding_applications(application_number);
CREATE INDEX idx_onboarding_status_city ON app.onboarding_applications(status, city);
CREATE INDEX idx_onboarding_lat_lng ON app.onboarding_applications(latitude, longitude);

-- Schedules (Partial Unique: 1 Active Published Schedule per Masjid)
CREATE UNIQUE INDEX ux_current_active_schedule ON app.schedules(masjid_id) WHERE (effective_until IS NULL AND status = 'PUBLISHED');
CREATE INDEX idx_schedules_masjid_active ON app.schedules(masjid_id, is_current, status);
CREATE INDEX idx_schedule_entries_schedule_id ON app.schedule_entries(schedule_id);

-- Assignments (Partial Unique: Strict 1:1 Active Assignment Rules)
CREATE UNIQUE INDEX idx_one_active_admin_per_masjid ON app.masjid_assignments(masjid_id) WHERE (is_active = true);
CREATE UNIQUE INDEX idx_one_active_masjid_per_admin ON app.masjid_assignments(user_id) WHERE (is_active = true);

-- Outbox Polling
CREATE INDEX idx_notification_outbox_polling ON app.notification_outbox(status, next_retry_at) WHERE (status = 'PENDING');
CREATE INDEX idx_idempotency_expires_at ON app.idempotency_keys(expires_at);

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Trigger 1: Sync Masjid Governance State on Assignment Creation/Revocation
CREATE OR REPLACE FUNCTION app.fn_sync_masjid_governance_state()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true)) THEN
        UPDATE app.masjids 
        SET governance_state = 'ADMIN_MANAGED', updated_at = NOW() 
        WHERE id = NEW.masjid_id;
    ELSIF (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false)) THEN
        IF NOT EXISTS (SELECT 1 FROM app.masjid_assignments WHERE masjid_id = OLD.masjid_id AND is_active = true) THEN
            UPDATE app.masjids 
            SET governance_state = 'COMPANY_MANAGED', updated_at = NOW() 
            WHERE id = OLD.masjid_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_masjid_governance_state ON app.masjid_assignments;
CREATE TRIGGER trg_sync_masjid_governance_state
AFTER INSERT OR UPDATE ON app.masjid_assignments
FOR EACH ROW EXECUTE FUNCTION app.fn_sync_masjid_governance_state();

-- Trigger 2: Auto-Update Masjid TSVECTOR Search Column
CREATE OR REPLACE FUNCTION app.fn_update_masjid_search_vector()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', coalesce(NEW.name_english, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.city, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.state, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(NEW.address_line1, '')), 'D');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_masjid_search_vector ON app.masjids;
CREATE TRIGGER trg_update_masjid_search_vector
BEFORE INSERT OR UPDATE ON app.masjids
FOR EACH ROW EXECUTE FUNCTION app.fn_update_masjid_search_vector();



-- ------------------------------------------------------------------------------
-- 7. SEED DATA (INITIAL SYSTEM ROLES & DEFAULT SETTINGS)
-- ------------------------------------------------------------------------------

-- Seed Roles
INSERT INTO app.roles (code, name, description, is_system) VALUES
('COMPANY_SUPER_ADMIN', 'Company Super Admin', 'Platform Founder & Core Operations Team with global access', true),
('MOSQUE_ADMIN', 'Mosque Administrator', 'Local Mosque Representative managing prayer times via Mobile App', true)
ON CONFLICT (code) DO NOTHING;

-- Seed Default Settings
INSERT INTO app.system_settings (key, value, category, description) VALUES
('OTP_EXPIRY_MINUTES', '10'::jsonb, 'SECURITY', 'Lifetime of WhatsApp 6-digit OTP verification codes in minutes'),
('OTP_MAX_ATTEMPTS', '3'::jsonb, 'SECURITY', 'Maximum allowed invalid OTP attempts before session invalidation'),
('DUPLICATE_MASJID_RADIUS_METERS', '50'::jsonb, 'GEO', 'PostGIS spatial radius in meters for duplicate masjid detection')
ON CONFLICT (key) DO NOTHING;

COMMIT;
