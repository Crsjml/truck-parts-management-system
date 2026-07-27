-- Refuse to run if promoting STAFF would leave nobody able to administer the system.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "StaffRole" WHERE "role" = 'SUPERADMIN') = 0 THEN
    RAISE EXCEPTION 'Refusing to migrate: no SUPERADMIN exists. Promote one account to SUPERADMIN before running this migration, or the system will have no one able to manage staff or settings.';
  END IF;
END $$;

-- Promote every STAFF account to ADMIN. This is a privilege increase: these
-- accounts gain part deletion, supplier and purchase-order access. It is
-- deliberate — the two-tier model has no lower rung.
UPDATE "StaffRole" SET "role" = 'ADMIN' WHERE "role" = 'STAFF';

-- Create or update the enum.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StaffRoleLevel') THEN
    CREATE TYPE "StaffRoleLevel" AS ENUM ('SUPERADMIN', 'ADMIN');
  END IF;
END $$;

ALTER TABLE "StaffRole" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "StaffRole" ALTER COLUMN "role" TYPE "StaffRoleLevel" USING ("role"::text::"StaffRoleLevel");
ALTER TABLE "StaffRole" ALTER COLUMN "role" SET DEFAULT 'ADMIN'::"StaffRoleLevel";

-- Drop the permission booleans. The role is now the only source of truth.
ALTER TABLE "StaffRole" DROP COLUMN IF EXISTS "canManageCatalog";
ALTER TABLE "StaffRole" DROP COLUMN IF EXISTS "canViewFinances";
ALTER TABLE "StaffRole" DROP COLUMN IF EXISTS "canProcessOrders";
ALTER TABLE "StaffRole" DROP COLUMN IF EXISTS "canManageStaff";

-- Null means "allowlisted but has never signed in".
ALTER TABLE "StaffRole" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

