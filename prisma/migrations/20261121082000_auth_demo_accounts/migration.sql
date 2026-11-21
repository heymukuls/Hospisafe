ALTER TABLE `Staff`
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD COLUMN `passwordHash` VARCHAR(255) NULL;

CREATE UNIQUE INDEX `Staff_email_key` ON `Staff`(`email`);
