-- New users default to light theme; existing rows unchanged.
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'light';
