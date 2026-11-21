ALTER TABLE `Task`
  ADD COLUMN `taskType` ENUM('ROUTINE', 'SPECIAL') NOT NULL DEFAULT 'SPECIAL',
  ADD COLUMN `routineScheduleId` VARCHAR(191) NULL,
  ADD COLUMN `routineOccurrenceDate` DATETIME(3) NULL;

CREATE TABLE `RoutineSchedule` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `priority` ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
  `frequency` ENUM('DAILY') NOT NULL DEFAULT 'DAILY',
  `dueTime` VARCHAR(5) NOT NULL DEFAULT '09:00',
  `startDate` DATETIME(3) NOT NULL,
  `endDate` DATETIME(3) NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `hospitalId` VARCHAR(191) NOT NULL,
  `floorId` VARCHAR(191) NOT NULL,
  `departmentId` VARCHAR(191) NOT NULL,
  `areaId` VARCHAR(191) NOT NULL,
  `assignedToId` VARCHAR(191) NULL,
  `createdById` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `RoutineSchedule_hospitalId_isActive_idx` (`hospitalId`, `isActive`),
  INDEX `RoutineSchedule_assignedToId_idx` (`assignedToId`),
  INDEX `RoutineSchedule_areaId_idx` (`areaId`),
  CONSTRAINT `RoutineSchedule_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoutineSchedule_floorId_fkey` FOREIGN KEY (`floorId`) REFERENCES `Floor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoutineSchedule_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoutineSchedule_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `Area`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `RoutineSchedule_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `RoutineSchedule_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `Task_routineScheduleId_routineOccurrenceDate_key` ON `Task`(`routineScheduleId`, `routineOccurrenceDate`);
CREATE INDEX `Task_taskType_dueAt_idx` ON `Task`(`taskType`, `dueAt`);
ALTER TABLE `Task`
  ADD CONSTRAINT `Task_routineScheduleId_fkey` FOREIGN KEY (`routineScheduleId`) REFERENCES `RoutineSchedule`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
