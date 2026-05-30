-- DropForeignKey
ALTER TABLE "inbox_proposals" DROP CONSTRAINT IF EXISTS "inbox_proposals_matchedApplicationId_fkey";
ALTER TABLE "inbox_proposals" DROP CONSTRAINT IF EXISTS "inbox_proposals_userId_fkey";
ALTER TABLE "processed_emails" DROP CONSTRAINT IF EXISTS "processed_emails_userId_fkey";
ALTER TABLE "email_connections" DROP CONSTRAINT IF EXISTS "email_connections_userId_fkey";

-- DropTable
DROP TABLE IF EXISTS "inbox_proposals";
DROP TABLE IF EXISTS "processed_emails";
DROP TABLE IF EXISTS "email_connections";

-- DropEnum
DROP TYPE IF EXISTS "InboxProposalStatus";
DROP TYPE IF EXISTS "InboxEventType";
DROP TYPE IF EXISTS "EmailProvider";
