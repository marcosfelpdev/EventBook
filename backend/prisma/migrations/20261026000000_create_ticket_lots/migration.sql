-- CreateTable
CREATE TABLE ticket_lots (
    id INTEGER NOT NULL AUTO_INCREMENT,
    event_id INTEGER NOT NULL,
    name VARCHAR(191) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    sales_start_at DATETIME(3) NOT NULL,
    sales_end_at DATETIME(3) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,

    INDEX ticket_lots_event_id_active_idx(event_id, active),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE ticket_lots ADD CONSTRAINT ticket_lots_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT ON UPDATE CASCADE;
