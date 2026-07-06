CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paperId` int NOT NULL,
	`direction` varchar(255) NOT NULL,
	`directionCn` varchar(255),
	`summary` text,
	`content` text,
	`status` enum('pending','analyzing','completed','failed') NOT NULL DEFAULT 'pending',
	`orderIndex` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `papers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` text,
	`abstract` text,
	`keywords` text,
	`directions` text,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` varchar(512) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileSize` int,
	`extractedText` text,
	`status` enum('uploading','extracting','analyzing','completed','failed') NOT NULL DEFAULT 'uploading',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `papers_id` PRIMARY KEY(`id`)
);
