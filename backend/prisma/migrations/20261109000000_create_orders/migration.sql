CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `total` DECIMAL(20, 2) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paid_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    INDEX `orders_status_expires_at_idx` (`status`, `expires_at`),
    INDEX `orders_user_id_idx` (`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `lot_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price_snapshot` DECIMAL(10, 2) NOT NULL,
    INDEX `order_items_lot_id_idx` (`lot_id`),
    UNIQUE INDEX `order_items_order_id_lot_id_key` (`order_id`, `lot_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_lot_id_fkey` FOREIGN KEY (`lot_id`) REFERENCES `ticket_lots`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
